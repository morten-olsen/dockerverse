import Context, { Options } from './Context';
import createApi from './createCli';
import { Options as HostOptions } from './Host';
import Project, { SetupArgs, ProjectContainerArgs } from './Project';
import { IHosts } from './types/IProject';
import Container from './types/IContainer';
import { DockerOptions } from 'dockerode';

export { createApi, Project, ProjectContainerArgs, IHosts, Container, SetupArgs, HostOptions, Options, DockerOptions }
export default Context;
