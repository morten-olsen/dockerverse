import proxy from './src/buildins/proxy/project';
import secrets from './src/buildins/secrets';
import Dockerode from 'dockerode';
import path from 'path';

const config = {
  hosts: {
    main: {
      docker: new Dockerode(),
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
    secrets,
    proxy,
  },
};

export default config;
