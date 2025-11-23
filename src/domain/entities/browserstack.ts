export interface BrowserstackCredentials {
  username?: string;
  accessKey?: string;
}

export interface BrowserstackBuild {
  id: string;
  name: string;
  status: string;
  duration: number;
  buildTag: string;
  publicUrl: string;
}
