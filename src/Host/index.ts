import Docker from 'dockerode';
import { nanoid } from 'nanoid';
import path from 'path';

interface Options {
  docker: Docker;
  storage: {
    types: {[name: string]: string};
    shared: {[name: string]: string};
  };
}

class Host {
  #options: Options;
  #magic: Symbol;
  #networks: {[id: symbol]: string} = {};
  #volumes: {[id: symbol]: string} = {};

  constructor(options: Options, magic: Symbol) {
    this.#options = options;
    this.#magic = magic;
  }

  getDocker = (magic: Symbol) => {
    const { docker } = this.#options;
    if (magic !== this.#magic) {
      throw new Error('Invalid docker magic');
    }
    return docker;
  }

  getVolume = (id: symbol) => {
    return this.#volumes[id];
  }

  getNetwork = (id: symbol) => {
    return this.#networks[id];
  }

  ensureVolume = async (id: symbol) => {
    const { docker } = this.#options;
    const source = this.#volumes[id];
    if (!source) {
      throw new Error('Volume does not exists');
    }
    const target = path.join('/data', source);
    // TODO: pull busybox
    const options: Docker.ContainerCreateOptions = {
      Tty: false,
      HostConfig: {
        AutoRemove: true,
        Mounts: [{
          Target: '/data',
          Source: '/',
          Type: 'bind',
        }],
      },
    }
    await docker.run('busybox', ['mkdir', '-p', target], process.stdout, options);
  }

  createVolume = async (project: string, name: string, type: string) => {
    const { storage } = this.#options;
    const volumeSymbol = Symbol(`Volume ${project} ${name}`);
    const source = storage.types[type];
    if (!source) {
      throw new Error('Host does not support storage type');
    }
    const systemPath = path.join(source, project, path.resolve('/', name));
    // TODO: pull busybox
    this.#volumes[volumeSymbol] = systemPath;
    return volumeSymbol;
  }

  createNetwork = async (project: string, name: string) => {
    const { docker } = this.#options;
    const networks = await docker.listNetworks();
    const networkSymbol = Symbol(`Network ${project} ${name}`)
    let current = networks.find(n => n.Labels?.project === project && n.Labels?.name === name)?.Id;
    if (!current) {
      const network = await docker.createNetwork({
        Name: nanoid(),
        Labels: {
          project,
          name,
        },
      });
      current = network.id;
    }
    this.#networks[networkSymbol] = current;
    return networkSymbol;
  }
}

export type { Options };

export default Host;
