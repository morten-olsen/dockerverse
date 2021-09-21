import { Command } from 'commander';
import Context, { Options } from './Context';
import ExecutionContext from './Context/ExecutionContext';

const create = async (options: Options) => {
  const program = new Command();
  const context = new Context(options);
  await context.setup();

  const createExecutionContext = (opts: any) => {
    const executionContext = new ExecutionContext(opts);
    return executionContext;
  }

  program.option('-h, --hosts <hosts...>', 'host filter');

  const destroy = program.command('destroy [project] [container]');
  destroy.action(async (projectName?: string, containerName?: string) => {
    const executionContext = createExecutionContext({
      ...program.opts(),
      ...apply.opts(),
    });
    

    if (!projectName) {
      return context.destroy(executionContext);
    }

    const project = context.getProjectContext(projectName);
    
    if (!containerName) {
      return project.destroy(executionContext);
    }

    const container = project.containerContexts[containerName];
    return container.destroy(executionContext);

  });

  const apply = program.command('apply [project] [container]');
  apply.option('-b, --build', 'build image');
  apply.option('-r, --recreate', 'recreate container');
  apply.action(async (projectName?: string, containerName?: string) => {
    const executionContext = createExecutionContext({
      ...program.opts(),
      ...apply.opts(),
    });
    

    if (!projectName) {
      return context.apply(executionContext);
    }

    const project = context.getProjectContext(projectName);
    
    if (!containerName) {
      return project.apply(executionContext);
    }

    const container = project.containerContexts[containerName];
    return container.apply(executionContext);

  });

  const exec = program.command('exec [project] [container] [cmd...]');
  exec.action(async (projectName: string, containerName: string, cmd: string[]) => {
    const executionContext = createExecutionContext({
      ...program.opts(),
      ...apply.opts(),
    });

    const project = context.getProjectContext(projectName);
    const container = project.containerContexts[containerName];

    await container.exec(executionContext, cmd);
  });

  const cli = program.command('cli');
  for (let [projectName, projectContext] of Object.entries(context.projectContexts)) {
    const { project } = projectContext;
    if (project.createCli) {
      const command = cli.command(projectName);
      project.createCli(command, projectContext);
    }
  }

  return program;
};

export default create;


