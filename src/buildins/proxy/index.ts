import Project from '../../Project';
import { SetupArgs, ProjectContainerArgs } from '../../types/IProject';
import IContainer from '../../types/IContainer';

class Proxy extends Project {
  type = 'proxy';
  version = '1.0.0';
  provides = {
    'x:traefik:1.0.0': (project: string) => ({
      addToLoadbalancer: async (name: string, container: IContainer, domain: string, port: number) => {
        const traefikParam = `${project}-${name}`;
        const loadbalancedContainer: IContainer = {
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
      },
    }),
  };

  #name!: string;
  #network!: symbol;
  #domain!: string;
  #storage!: symbol;
  #host!: string;

  setup = async ({ name, hosts, env }: SetupArgs) => {
    this.#host = Object.keys(hosts)[0]; // For now we just setup the first docker host
    this.#name = name;
    this.#network = await hosts[this.#host].createNetwork('default');
    this.#storage = await hosts[this.#host].createVolume('acme', 'fast');
    this.#domain = env?.domain || 'loopback.services';
  }

  createContainers = async ({ getApi }: ProjectContainerArgs) => {
    const api = getApi('x:traefik:*')[this.#name];
    const [secrets] = Object.values(getApi('dockerverse:secrets:*'));

    const someSecret = await secrets.getSecret('some-secret-name1');

    const proxyContainer: IContainer = {
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
      environment: {
        SOME_SECRET: someSecret,
      },
      dockerAccess: true,
      volumes: [
        [this.#storage, '/acme'] as [symbol, string]
      ],
      ports: [
        ['80', '80'] as [string, string],
      ]
    }
    return {
      proxy: await api.addToLoadbalancer('proxy', proxyContainer, 'proxy', 8080),
    };
  }
}

export { Proxy };

export default new Proxy();
