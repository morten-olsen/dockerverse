import createCli from './createCli';
import path from 'path';

const run = async () => {
  const configPath = path.join(process.cwd(), 'docker');

  const config = require(configPath);

  const cli = await createCli(config.default || config);

  cli.parse(process.argv);
};

run().catch((err) => {
  console.error(err);
  process.exit(-1);
})
