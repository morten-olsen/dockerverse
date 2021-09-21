import Host from '../Host';

interface Secret {
  id: symbol;
  project: string;
}

interface Container {
  context?: string;
  image?: string;
  networks: symbol[];
  ports?: [string, string][];
  host: string;
  cmd?: string[];
  environement?: {
    [name: string]: string | Secret;
  };
  labels?: {
    [name: string]: string;
  };
  dockerAccess?: boolean;
  volumes?: [symbol, string][];
  configs?: [string, string][];
}

type Hosts = {
  [name: string]: Host;
}

interface SetupHosts {
  [name: string]: {
    createNetwork: (name: string) => Promise<symbol>;
    createVolume: (name: string, type: string) => Promise<symbol>;
  }
}

interface ProjectContainerArgs {
  getApi: <TApi = any>(provides: string) => {[name: string]: TApi};
}

interface Project {
  type: string;
  version: string;
  provides?: {[name: string]: (projectName: string) => any};
  setup: (name: string, hosts: SetupHosts, env?: any) => Promise<void>;
  createContainers?: (args: ProjectContainerArgs) => Promise<{
    [name: string]: Container;
  }>
}

export type { Container, SetupHosts, Hosts, ProjectContainerArgs, Secret };

export default Project;
