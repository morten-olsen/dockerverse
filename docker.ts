import proxy from './src/buildins/proxy';
import secrets from './src/buildins/secrets';
import path from 'path';
import { Options } from './src/index';

const config: Options = {
  hosts: {
    main: {
      storage: {
        types: {
          fast: path.join(process.cwd(), 'data', 'fast'),
          slow: path.join(process.cwd(), 'data', 'slow'),
        },
        shared: {},
      }
    },
  },
  projects: {
    secrets: secrets(),
    proxy,
  },
};

export default config;
