import IContainer from '../types/IContainer';
import IHostContext from '../types/IHostContext';
import ExecutionContext from './ExecutionContext';
import { nanoid } from 'nanoid';
import Dockerode from 'dockerode';
import { hasImage, pullImage } from '../helpers/docker';

interface Options {
  project: string;
  name: string;
  container: IContainer;
  hosts: IHostContext;
  getApi: (provides: string) => {[name: string]: any};
}

class ContainerContext {
  #options: Options;

  constructor(options: Options) {
    this.#options = options;
  }

  get #host() {
    const { container, hosts } = this.#options;
    const host = hosts[container.host];
    return host;
  }

  get #docker() {
    return this.#host.docker;
  }

  #getImageName = async () => {
    const { name, project, container } = this.#options;
    if (container.image) {
      return container.image;
    }
    const images = await this.#docker.listImages();
    const image = images.find(i => i.Labels?.name === name && i.Labels?.project === project);
    return image?.RepoTags[0];
  }

  public getCurrentId = async () => {
    const { name, project } = this.#options;
    const containers = await this.#docker.listContainers({
      all: true,
    });
    const current = containers.find(c => c.Labels?.name === name && c.Labels?.project === project);
    return current?.Id;
  }

  public isUpToDate = async () => {

  };

  public destroy = async (executionContext: ExecutionContext) => {
    const { name, project, container } = this.#options;
    if (executionContext.hosts && !executionContext.hosts.includes(container.host)) {
      return;
    }
    const context = executionContext.subContext('destroy');
    const containers = await this.#docker.listContainers({
      all: true,
    });
    const list = containers.filter(c => c.Labels?.name === name && c.Labels?.project === project);
    for (let { Id } of list) {
      const current = this.#docker.getContainer(Id);
      const info = await current.inspect();
      context.log(`destorying ${info.Name}`);
      if (info.State.Running) {
        await current.stop();
      }
      await current.remove();
    }
  }

  public pull = async (executionContext: ExecutionContext) => {
    const context = executionContext.subContext('create');
    const { container } = this.#options;
    if (!container.image) {
      return;
    }
    if (!await hasImage(this.#docker, container.image)) {
      context.log('starting');
      await pullImage(this.#docker, container.image);
      context.log('done');
    }
  }

  public build = async (executionContext: ExecutionContext) => {
    const context = executionContext.subContext('build');
    const { name, project, container } = this.#options;
    const tag = await this.#getImageName() || `${project}_${name}_${nanoid().toLowerCase()}`;
    if (!container.context) {
      return;
    }
    context.log('starting');
    const stream = await this.#docker.buildImage(
      {
        context: container.context,
        src: ['Dockerfile']
      },
      {
        t: tag,
        labels: {
          name,
          project,
        }
      }
    );
    stream.pipe(process.stdout);
    await new Promise((resolve, reject) => {
      this.#docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
    });
    context.log('done');
  }

  public apply = async (executionContext: ExecutionContext) => {
    const context = executionContext.subContext('apply');
    await this.create(context, false);
  }

  public execCmd = (ExecutionContext: ExecutionContext, command: string[]) => new Promise<string>(async (resolve, reject) => {
    const id = await this.getCurrentId();
    if (!id) {
      throw new Error('Container not running');
    }
    const container = this.#docker.getContainer(id);
    const exec = await container.exec({
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      Cmd: command,
    })
    const stream = await exec.start({
      hijack: true,
    });

    let result = '';

    stream.on('data', (data) => {
      result += data.toString();
    });

    stream.on('end', () => {
      resolve(result);
    });

    stream.on('error', (err) => {
      reject(err);
    })
  })

  public exec = (ExecutionContext: ExecutionContext, command: string[]) => new Promise<void>(async (resolve, reject) => {
    const id = await this.getCurrentId();
    if (!id) {
      throw new Error('Container not running');
    }
    const container = this.#docker.getContainer(id);
    const exec = await container.exec({
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: command,
    })
    exec.start({
      hijack: true,
      stdin: true,
    }, (err, stream) => {
      if (err || !stream) {
        return reject(err || new Error('Stream could not be created'));
      }
      this.#docker.modem.demuxStream(stream, process.stdout, process.stderr);
      process.stdin.pipe(stream);
      stream.on('end', () => {
        process.stdin.unpipe(stream);
        resolve();
      });
    });

  })

  public create = async (executionContext: ExecutionContext, recreate: boolean) => {
    const context = executionContext.subContext('create');
    const { name, project, container, getApi } = this.#options;
    if (executionContext.hosts && !executionContext.hosts.includes(container.host)) {
      return;
    }
    context.log('starting');
    await this.pull(context);
    let imageName = await this.#getImageName();
    if (!imageName || executionContext.build) {
      await this.build(context);
      imageName = await this.#getImageName();
    }
    const [mainNetworkId, ...networkIds] = container.networks;
    const mainNetwork = mainNetworkId ? {
      [this.#host.getNetwork(mainNetworkId)]: {
        NetworkID: this.#host.getNetwork(mainNetworkId),
      }
    } : undefined;
    const volumes = await Promise.all(container.volumes?.map(async ([id, target]) => {
      await this.#host.ensureVolume(id);
      const mount: Dockerode.MountSettings = {
        Source: this.#host.getVolume(id),
        Target: target,
        Type: 'bind',
      };
      return mount;
    }) || []);
    const dockerVolume: Dockerode.MountSettings[] = !container.dockerAccess ? [] : [{
      Source: '/var/run/docker.sock',
      Target: '/var/run/docker.sock',
      Type: 'bind',
    }];
    const environment = await Promise.all(Object.entries(container.environment || {}).map(async ([name, value]) => {
      if (typeof value !== 'string') {
        const secretsApi = getApi('dockerverse:secrets:*');
        const text = await secretsApi[value.project].getSecretValue(value.id);
        return `${name}=${text}`
      } else {
        return `${name}=${value}`
      }
    }));
    const ports = (container.ports || []).reduce((output, [source, target]) => ({
      ...output,
      [`${target}/tcp`]: [{
        HostPort: source,
      }],
    }), {});
    const exposedPorts = (container.ports || []).reduce((output, [, target]) => ({
      ...output,
      [`${target}/tcp`]: {},
    }), {});
    const dockerContainerInfo: Dockerode.ContainerCreateOptions = {
      Image: imageName,
      name: `${project}_${name}_${nanoid()}`,
      Labels: {
        ...container.labels || {},
        name,
        project,
      },
      Cmd: container.cmd,
      NetworkingConfig: {
        EndpointsConfig: mainNetwork,
      },
      Env: environment,
      ExposedPorts: exposedPorts,
      HostConfig: {
        Mounts: [
          ...volumes,
          ...dockerVolume,
        ],
        PortBindings: ports,
      }
    };
    await this.destroy(context);
    const dockerContainer = await this.#docker.createContainer(dockerContainerInfo);
    await dockerContainer.start();
    for (let networkId of networkIds) {
      const network = this.#docker.getNetwork(this.#host.getNetwork(networkId));
      await network.connect({
        Container: dockerContainer.id,
      });
    }
    context.log('done');
  }
}

export default ContainerContext;
