interface Options {
  hosts?: string[];
  build?: boolean;
}

class ExecutionContext {
  #options: Options;

  constructor(options: Options) {
    this.#options = options;
  }

  get hosts() {
    return this.#options.hosts;
  }

  get build() {
    return !!this.#options.build;
  }
}

export default ExecutionContext;
