import Docker from 'dockerode';
import { nanoid } from 'nanoid';
import path from 'path';
import { hasImage, pullImage } from '../helpers/docker';

interface Options {
  docker?: Docker.DockerOptions;
  storage: {
    types: {[name: string]: string};
    shared: {[name: string]: string};
  };
}

class Host {
  #options: Options;
  #docker: Docker;
  #networks: {[id: symbol]: string} = {};
  #volumes: {[id: symbol]: string} = {};

  constructor(options: Options) {
    this.#options = options;
    this.#docker = new Docker(options.docker);
  }

  get storageTypes() {
    return Object.keys(this.#options.storage);
  }

  get docker() {
    return this.#docker;
  }

  getVolume = (id: symbol) => {
    return this.#volumes[id];
  }

  getNetwork = (id: symbol) => {
    return this.#networks[id];
  }

  ensureVolume = async (id: symbol) => {
    const source = this.#volumes[id];
    if (!source) {
      throw new Error('Volume does not exists');
    }
    const target = path.join('/data', source);
    if (!await hasImage(this.#docker, 'busybox')) {
      await pullImage(this.#docker, 'busybox');
    }
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
    await this.#docker.run('busybox', ['mkdir', '-p', target], process.stdout, options);
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
    const networks = await this.#docker.listNetworks();
    const networkSymbol = Symbol(`Network ${project} ${name}`)
    let current = networks.find(n => n.Labels?.project === project && n.Labels?.name === name)?.Id;
    if (!current) {
      const network = await this.#docker.createNetwork({
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
