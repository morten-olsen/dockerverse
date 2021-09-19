import Project, { ApiSearch, Hosts, Api } from '../types/Project';
import ProjectContext from './ProjectContext';
import Host, { Options as HostOptions } from '../Host';
import ExecutionContext from './ExecutionContext';

interface Options {
  hosts: {
    [name: string]: HostOptions;
  };
  projects: {
    [name: string]: Project;
  };
}

class Context {
  #options: Options;
  #magic: symbol;
  #hosts: Hosts;
  #projectContexts: {[name: string]: ProjectContext}

  constructor(options: Options) {
    this.#options = options;
    this.#magic = Symbol('Docker magic');
    this.#hosts = Object.entries(options.hosts).reduce((output, [name, options]) => ({
      ...output,
      [name]: new Host(options, this.#magic),
    }), {} as Hosts);
    this.#projectContexts = Object.entries(options.projects).reduce((output, [name, project]) => {
      const projectContext = new ProjectContext({
        name,
        project,
        hosts: this.#hosts,
        magic: this.#magic,
        getApi: this.#getApi,
      });
      return {
        ...output,
        [name]: projectContext,
      }
    }, {} as {[name: string]: ProjectContext})
  }

  #getApi = (projectName: string, search: ApiSearch) => {
    const { projects } = this.#options;
    const results = Object.entries(projects).filter(([name, project]) => {
      if (search.name && search.name !== name) {
        return false;
      }
      if (search.type && project.type !== search.type) {
        return false;
      }
      if (search.provides) {
        const provides = project.provides || {};
        for (var [depName, depVersion] of Object.entries(search.provides)) {
          if (!provides[depName]) {
            return false;
          }
          // TODO: version check
        }
      }
      return true;
    })
    return results.reduce((output, [name, project]) => ({
      ...output,
      [name]: project.getApi(projectName),
    }), {} as {[name: string]: Api});
  }

  public setup = async () => {
    await Promise.all(Object.values(this.#projectContexts).map(p => p.setup()));
  }

  public getProjectContext = (name: string) => {
    return this.#projectContexts[name];
  }
  
  public apply = async (executionContext: ExecutionContext) => {
    for (let project of Object.values(this.#projectContexts)) {
      await project.apply(executionContext);
    }
  }
}

export type { Options };

export default Context;
