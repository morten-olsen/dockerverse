import IContainer from './IContainer';

interface IHosts {
  [name: string]: {
    readonly storageTypes: string[];
    createNetwork: (name: string) => Promise<symbol>;
    createVolume: (name: string, type: string) => Promise<symbol>;
  }
}

interface SetupArgs {
  name: string;
  hosts: IHosts;
  env?: any;
}

interface ProjectContainerArgs {
  getApi: <TApi = any>(provides: string) => {[name: string]: TApi};
}

interface IProject {
  type: string;
  version: string;
  provides?: {[name: string]: (projectName: string) => any};
  setup: (args: SetupArgs) => Promise<void>;
  createContainers?: (args: ProjectContainerArgs) => Promise<{
    [name: string]: IContainer;
  }>
}

export type { IHosts, SetupArgs, ProjectContainerArgs };

export default IProject;
