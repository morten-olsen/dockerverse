import Project from '../../types/Project';
import { nanoid } from 'nanoid';

class Secrets implements Project {
  type = 'secrets';
  version = '1.0.0';
  provides = {
    'x:secrets:1.0.0': (project: string) => ({
      getRandomSecret: this.#getRandomSecret.bind(null, project),
      getSecret: this.#getSecret,
    }),
  };

  #secrets: {[id: symbol]: string} = {};
  #name!: string;

  public setup = async (name: string) => {
    this.#name = name;
  };

  #getSecret = async (id: symbol) => {
    return this.#secrets[id];
  }

  #getRandomSecret = async (project: string, name: string) => {
    const secretSymbol = Symbol(`Secret ${project} ${name}`); 
    const secret = nanoid();

    this.#secrets[secretSymbol] = secret;
    return {
      project: this.#name,
      id: secretSymbol,
    };
  }
}

export { Secrets };

export default new Secrets();
