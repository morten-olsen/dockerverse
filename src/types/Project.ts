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

type Api = {
  [name: string]: (...args: any[]) => Promise<any>;
};

type Hosts = {
  [name: string]: Host;
}

interface SetupHosts {
  [name: string]: {
    createNetwork: (name: string) => Promise<symbol>;
    createVolume: (name: string, type: string) => Promise<symbol>;
  }
}

interface ApiSearch {
  name?: string;
  type?: string;
  provides?: {[name: string]: string};
}

interface ProjectContainerArgs {
  getApi: (search: ApiSearch) => {[name: string]: Api};
}

interface Project {
  type: string;
  version: string;
  provides?: {[name: string]: string};
  setup: (name: string, hosts: SetupHosts, env?: any) => Promise<void>;
  createContainers?: (args: ProjectContainerArgs) => Promise<{
    [name: string]: Container;
  }>
  getApi: (project: string) => Api;
}

export type { Container, Api, SetupHosts, Hosts, ProjectContainerArgs, ApiSearch, Secret };

export default Project;
