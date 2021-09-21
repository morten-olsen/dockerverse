import Project from '../../Project';
import { SetupArgs, ProjectContainerArgs } from '../../types/IProject';
import IContainer from '../../types/IContainer';

interface Options {
  host: string;
}

class Gitea extends Project {
  type = 'gitea';
  version = '1.0.0';

  #options: Options;
  #network!: symbol;
  #storage!: symbol;

  constructor(options: Options) {
    super();
    this.#options = options;
  }

  setup = async ({ hosts }: SetupArgs) => {
    this.#network = await hosts[this.#options.host].createNetwork('default');
    this.#storage = await hosts[this.#options.host].createVolume('data', 'fast');
  }

  createContainers = async ({ getApi }: ProjectContainerArgs) => {
    const [api] = Object.values(getApi('x:traefik:*'));
    const [secrets] = Object.values(getApi('dockerverse:secrets:*'));

    const giteaContainer: IContainer = {
      image: 'gitea/gitea:1.15.2',
      host: this.#options.host,
      networks: [
        this.#network,
      ],
      volumes: [
        [this.#storage, '/data'] as [symbol, string]
      ],
      ports: [
        ['2221', '22'] as [string, string],
      ]
    }
    return {
      gitea: await api.addToLoadbalancer('gitea', giteaContainer, 'gitea', 3000),
    };
  }
}

export { Gitea };

export default (options: Options) => new Gitea(options);
