import Project, { SetupArgs } from '../../Project';
import { nanoid } from 'nanoid';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { Command } from 'commander';

class Secrets extends Project {
  type = 'secrets';
  version = '1.0.0';
  provides = {
    'dockerverse:secrets:0.0.1': (project: string) => ({
      getRandomSecret: this.#getRandomSecret.bind(null, project),
      getSecret: this.#getSecret.bind(null, project),
      getSecretValue: this.#getSecretValue,
    }),
  };

  #location: string;
  #secrets: {[id: symbol]: string} = {};
  #name!: string;

  constructor(location = path.join(process.cwd(), '.secrets')) {
    super();
    this.#location = location;
  }

  public setup = async ({ name }: SetupArgs) => {
    this.#name = name;
  };

  #getSecretValue = async (id: symbol) => {
    return this.#secrets[id];
  }

  #removeSecret = async (project: string, name: string) => {
    const file = path.join(this.#location, project, name);
    if (fs.existsSync(file)) {
      await fs.unlink(file);
    }
  }

  #getSecret = async (project: string, name: string) => {
    const secretSymbol = Symbol(`Secret ${project} ${name}`); 
    let secret: string;
    const folder = path.join(this.#location, project);
    const file = path.join(this.#location, project, name);
    await fs.mkdirp(folder);
    if (fs.existsSync(file)) {
      secret = await fs.readFile(file, 'utf-8');
    } else {
      const answers = await inquirer.prompt([{
        type: 'password',
        name: 'secret',
        mask: '*',
        message: `Secret for ${project}/${name}`,
      }])
      secret = answers.secret;
      await fs.writeFile(file, secret, 'utf-8');
    }

    this.#secrets[secretSymbol] = secret;
    return {
      project: this.#name,
      id: secretSymbol,
    };
  }

  #getRandomSecret = async (project: string, name: string) => {
    const secretSymbol = Symbol(`Secret ${project} ${name}`); 
    let secret: string;
    const folder = path.join(this.#location, project);
    const file = path.join(this.#location, project, name);
    await fs.mkdirp(folder);
    if (fs.existsSync(file)) {
      secret = await fs.readFile(file, 'utf-8');
    } else {
      secret = nanoid();
      await fs.writeFile(file, secret, 'utf-8');
    }

    this.#secrets[secretSymbol] = secret;
    return {
      project: this.#name,
      id: secretSymbol,
    };
  }

  createCli = (program: Command) => {
    const remove = program.command('remove [project] [name]');
    remove.action(async (project: string, name: string) => {
      await this.#removeSecret(project, name);
    });
    
  }
}

export { Secrets };

export default (location?: string) => new Secrets(location);
