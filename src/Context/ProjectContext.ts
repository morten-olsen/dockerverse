import Project, { Api, ApiSearch, Hosts, SetupHosts } from '../types/Project';
import ExecutionContext from './ExecutionContext';
import ContainerContext from './Container';

interface Options {
  name: string;
  project: Project;
  hosts: Hosts,
  magic: symbol,
  getApi: (projectName: string, search: ApiSearch) => {[name: string]: Api};
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
        getApi: (search: ApiSearch) => getApi(name, search),
      }),
    }), {} as {[name: string]: ContainerContext});
  }

  public setup = async () => {
    const { name, project, hosts } = this.#options;
    const setupHosts = Object.entries(hosts).reduce((output, [hostName, current]) => ({
      ...output,
      [hostName]: {
        createNetwork: (networkName: string) => current.createNetwork(name, networkName),
        createVolume: (volumeName: string, type: string) => current.createVolume(name, volumeName, type),
      }
    }), {} as SetupHosts)
    await project.setup(name, setupHosts);
    this.#containerContexts = await this.#getContainerContexts();
  }

  public build = async () => {
    const containers = this.containerContexts;
    for (let [, container] of Object.entries(containers)) {
      await container.build()
    }
  }

  public stop = async () => {
    const containers = this.containerContexts;
    for (let [, container] of Object.entries(containers).reverse()) {
      await container.stop()
    }
  }

  public apply = async (executionContext: ExecutionContext) => {
    const containers = this.containerContexts;
    for (let [name, container] of Object.entries(containers)) {
      await container.apply(executionContext);
    }
  }

  public logs = async () => {
    // TODO: add
  }
}

export default ProjectContext;
