export type Bindings = {
  DB: D1Database;
  OWNER_EMAIL?: string;
};

export type Variables = {
  userEmail: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
