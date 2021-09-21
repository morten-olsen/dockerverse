import IContainer from '../types/IContainer';
import IHostContext from '../types/IHostContext';
import ExecutionContext from './ExecutionContext';
import { nanoid } from 'nanoid';
import Dockerode from 'dockerode';

interface Options {
  project: string;
  name: string;
  container: IContainer;
  hosts: IHostContext;
  getApi: (provides: string) => {[name: string]: any};
  magic: Symbol;
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
    const { magic } = this.#options;
    return this.#host.getDocker(magic);
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
    const containers = await this.#docker.listContainers({
      all: true,
    });
    const list = containers.filter(c => c.Labels?.name === name && c.Labels?.project === project);
    for (let { Id } of list) {
      const current = this.#docker.getContainer(Id);
      const info = await current.inspect();
      if (info.State.Running) {
        await current.stop();
      }
      await current.remove();
    }
  }

  public build = async () => {
    const { name, project, container } = this.#options;
    const tag = await this.#getImageName() || `${project}_${name}_${nanoid().toLowerCase()}`;
    if (!container.context) {
      return;
    }
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
  }

  public apply = async (executionContext: ExecutionContext) => {
    await this.create(executionContext, false);
  }

  public create = async (executionContext: ExecutionContext, recreate: boolean) => {
    const { name, project, container, getApi } = this.#options;
    if (executionContext.hosts && !executionContext.hosts.includes(container.host)) {
      return;
    }
    let imageName = await this.#getImageName();
    if (!imageName || executionContext.build) {
      await this.build();
      imageName = await this.#getImageName();
    }
    const networks = container.networks.reduce((output, current) => {
      const network = this.#host.getNetwork(current);
      output[network] = {
        NetworkID: network,
      }
      return output;
    }, {} as Dockerode.EndpointsConfig);
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
        const secretsApi = getApi('x:secrets:1.0.0');
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
        EndpointsConfig: networks,
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
    await this.destroy(executionContext);
    const dockerContainer = await this.#docker.createContainer(dockerContainerInfo);
    await dockerContainer.start();
  }
}

export default ContainerContext;
