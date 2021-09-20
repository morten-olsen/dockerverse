import Project, { SetupHosts, Container, ProjectContainerArgs } from '../../types/Project';

class Proxy implements Project {
  type = 'proxy';
  version = '1.0.0';
  provides = {
    'proxy': '0.0.1',
  };
  getApi = (project: string) => ({
    addToLoadbalancer: async (name: string, container: Container, domain: string, port: number) => {
      const traefikParam = `${project}-${name}`;
      const loadbalancedContainer: Container = {
        ...container,
        networks: [
          ...container.networks,
          this.#network,
        ],
        labels: {
          ...container.labels || {},
          'traefik.enable': 'true',
          [`traefik.http.routers.${traefikParam}.rule`]: `Host(\`${domain}.${this.#domain}\`)`,
          [`traefik.http.services.${traefikParam}.loadbalancer.server.port`]: port.toString(),
        },
      };
      return loadbalancedContainer;
    }
  });

  #name!: string;
  #network!: symbol;
  #domain!: string;
  #storage!: symbol;
  #host!: string;

  setup = async (name: string, hosts: SetupHosts, env?: any) => {
    this.#host = Object.keys(hosts)[0]; // For now we just setup the first docker host
    this.#name = name;
    this.#network = await hosts[this.#host].createNetwork('default');
    this.#storage = await hosts[this.#host].createVolume('acme', 'fast');
    this.#domain = env?.domain || 'loopback.services';
  }

  createContainers = async ({ getApi }: ProjectContainerArgs) => {
    const api = getApi({ name: this.#name })[this.#name];

    return {
      proxy: await api.addToLoadbalancer('proxy', {
        image: 'traefik:2.5',
        host: this.#host,
        networks: [
          this.#network,
        ],
        cmd: [
          '--providers.docker=true',
          '--providers.docker.exposedByDefault=false',
          '--api=true',
          '--api.insecure=true',
        ],
        dockerAccess: true,
        volumes: [
          [this.#storage, '/acme'] as [symbol, string]
        ],
        ports: [
          ['80', '80'] as [string, string],
        ]
      }, 'proxy', 8080),
    };
  }
}

export { Proxy };

export default new Proxy();
