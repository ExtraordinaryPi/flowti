export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  roles?: string[];
}

export interface UserRequest {
  username?: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface Client {
  id: number;
  name: string;
  alias: string;
  state: string;
  lastLogin?: string;
}

export interface ClientRequest {
  name: string;
  alias?: string;
  password?: string;
}

export interface Folder {
  id: number;
  name: string;
  parent?: { id: number; name: string };
}

export interface FolderRequest {
  name: string;
  parentId?: number;
}

export interface CurrentUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
}
