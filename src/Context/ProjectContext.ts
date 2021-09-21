import IProject, { IHosts } from '../types/IProject';
import IHostContext from '../types/IHostContext';
import ExecutionContext from './ExecutionContext';
import ContainerContext from './ContainerContext';

interface Options {
  name: string;
  project: IProject;
  hosts: IHostContext,
  magic: symbol,
  getApi: (projectName: string, provides: string) => {[name: string]: any};
}

class ProjectContext {
  #options: Options;
  #containerContexts?: {[name: string]: ContainerContext};

  constructor(options: Options) {
    this.#options = options;
  }

  get containerContexts() {
    if (!this.#containerContexts) {
      throw new Error("Project context not initialized");
    }
    return this.#containerContexts;
  }

  #getContainerContexts = async () => {
    const { getApi, project, magic, hosts, name } = this.#options;
    if (!project.createContainers) {
      return {};
    }
    const containers = await project.createContainers({
      getApi: getApi.bind(null, name),
    });
    return Object.entries(containers).reduce((output, [containerName, container]) => ({
      ...output,
      [name]: new ContainerContext({
        name: containerName,
        container,
        magic,
        hosts,
        project: name,
        getApi: (provides) => getApi(name, provides),
      }),
    }), {} as {[name: string]: ContainerContext});
  }

  public setup = async () => {
    const { name, project, hosts } = this.#options;
    const setupHosts = Object.entries(hosts).reduce<IHosts>((output, [hostName, current]) => ({
      ...output,
      [hostName]: {
        storageTypes: current.storageTypes,
        createNetwork: (networkName: string) => current.createNetwork(name, networkName),
        createVolume: (volumeName: string, type: string) => current.createVolume(name, volumeName, type),
      }
    }), {});
    await project.setup({ name, hosts: setupHosts });
    this.#containerContexts = await this.#getContainerContexts();
  }

  public build = async () => {
    const containers = this.containerContexts;
    for (let [, container] of Object.entries(containers)) {
      await container.build()
    }
  }

  public destroy = async (executionContext: ExecutionContext) => {
    const containers = this.containerContexts;
    for (let [, container] of Object.entries(containers).reverse()) {
      await container.destroy(executionContext)
    }
  }

  public apply = async (executionContext: ExecutionContext) => {
    const containers = this.containerContexts;
    for (let [, container] of Object.entries(containers)) {
      await container.apply(executionContext);
    }
  }

  public logs = async () => {
    // TODO: add
  }
}

export default ProjectContext;
