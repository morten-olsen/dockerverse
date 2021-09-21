import IContainer from './IContainer';
import { Command } from 'commander';
import ProjectContext from '../Context/ProjectContext';

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
  createCli?: (command: Command, context: ProjectContext) => void;
}

export type { IHosts, SetupArgs, ProjectContainerArgs };

export default IProject;
