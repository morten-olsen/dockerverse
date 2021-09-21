import IProject from '../types/IProject';
import IHostContext from '../types/IHostContext';
import ProjectContext from './ProjectContext';
import Host, { Options as HostOptions } from '../Host';
import ExecutionContext from './ExecutionContext';
import semver from 'semver';

interface Options {
  hosts: {
    [name: string]: HostOptions;
  };
  projects: {
    [name: string]: IProject;
  };
}

class Context {
  #options: Options;
  #hosts: IHostContext;
  #projectContexts: {[name: string]: ProjectContext}

  constructor(options: Options) {
    this.#options = options;
    this.#hosts = Object.entries(options.hosts).reduce<IHostContext>((output, [name, options]) => ({
      ...output,
      [name]: new Host(options),
    }), {});
    this.#projectContexts = Object.entries(options.projects).reduce((output, [name, project]) => {
      const projectContext = new ProjectContext({
        name,
        project,
        hosts: this.#hosts,
        getApi: this.#getApi,
      });
      return {
        ...output,
        [name]: projectContext,
      }
    }, {} as {[name: string]: ProjectContext})
  }

  get projectContexts() {
    return this.#projectContexts;
  }

  #getApi = (projectName: string, provides: string) => {
    const { projects } = this.#options;
    const [reqAuthority, reqName, reqVersion] = provides.split(':');
    const apis = Object.entries(projects).reduce((output, [n, project]) => {
      for (let [provides, createApi] of Object.entries(project.provides || {})) {
        const [authority, name, version] = provides.split(':');
        if (reqAuthority === authority && reqName === name && semver.satisfies(version, reqVersion)) {
          return {
            ...output,
            [n]: createApi(projectName),
          }
        }
      }
      return output;
    }, {} as {[name: string]: any})
    return apis;
  }

  public setup = async () => {
    await Promise.all(Object.values(this.#projectContexts).map(p => p.setup()));
  }

  public getProjectContext = (name: string) => {
    return this.#projectContexts[name];
  }
  
  public apply = async (executionContext: ExecutionContext) => {
    for (let [name, project] of Object.entries(this.#projectContexts)) {
      const context = executionContext.subContext(name);
      await project.apply(context);
    }
  }

  public destroy = async (executionContext: ExecutionContext) => {
    for (let [name, project] of Object.entries(this.#projectContexts)) {
      const context = executionContext.subContext(name);
      await project.destroy(context);
    }
  }
}

export type { Options };

export default Context;
