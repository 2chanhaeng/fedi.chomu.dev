export interface AuthActor {
  name: string | null;
  handle: string;
  avatar?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  actor?: AuthActor;
}
