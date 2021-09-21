import { Command } from 'commander';
import Context, { Options } from './Context';
import ExecutionContext from './Context/ExecutionContext';

const create = (options: Options) => {
  const program = new Command();

  const createExecutionContext = (opts: any) => {
    const executionContext = new ExecutionContext(opts);
    return executionContext;
  }

  program.option('-h, --hosts <hosts...>', 'host filter');

  const destroy = program.command('destroy [project] [container]');
  destroy.action(async (projectName?: string, containerName?: string) => {
    const context = new Context(options);
    await context.setup();
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
    const context = new Context(options);
    await context.setup();
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

  return program;
};

export default create;


