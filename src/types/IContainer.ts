import ISecret from './ISecret';

interface IContainer {
  context?: string;
  image?: string;
  networks: symbol[];
  ports?: [string, string][];
  host: string;
  cmd?: string[];
  environment?: {
    [name: string]: string | ISecret;
  };
  labels?: {
    [name: string]: string;
  };
  dockerAccess?: boolean;
  volumes?: [symbol, string][];
  configs?: [string, string][];
}

export default IContainer;
