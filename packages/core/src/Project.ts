import IProject, { SetupArgs, ProjectContainerArgs } from './types/IProject';

interface Project extends IProject {
}

abstract class Project implements IProject {
}

export { SetupArgs, ProjectContainerArgs };
export default Project;
