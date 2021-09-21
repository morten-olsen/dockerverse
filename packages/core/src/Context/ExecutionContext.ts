import chalk from 'chalk';

interface Options {
  hosts?: string[];
  build?: boolean;
}

class ExecutionContext {
  #options: Options;
  #namespaces: string[];

  constructor(options: Options, namespaces: string[] = []) {
    this.#options = options;
    this.#namespaces = namespaces;
  }

  get hosts() {
    return this.#options.hosts;
  }

  get build() {
    return !!this.#options.build;
  }

  public log = (message: string) => {
    const namespace = this.#namespaces.join('::');
    console.log(`${chalk.green(namespace)}: ${message}`);
  }

  public subContext = (namespace: string) => {
    return new ExecutionContext(this.#options, [...this.#namespaces, namespace])
  }
}

export default ExecutionContext;
