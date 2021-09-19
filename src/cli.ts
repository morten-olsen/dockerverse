import createCli from './createCli';
import path from 'path';

const configPath = path.join(process.cwd(), 'docker');

const config = require(configPath);

const cli = createCli(config.default || config);

cli.parse(process.argv);
