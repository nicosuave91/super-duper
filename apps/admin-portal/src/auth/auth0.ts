// apps/admin-portal/src/auth/auth0.ts
// Build-safe Auth0 façade for Phase 1.
// - Default export is a Vue plugin: app.use(auth0)
// - Also exports named functions used by stores/auth.ts

import type { App, Plugin } from "vue";

export type Auth0ClientLike = {
  isAuthenticated: () => Promise<boolean>;
  getUser: () => Promise<any>;
  loginWithRedirect: (opts?: any) => Promise<void>;
  logout: (opts?: any) => void;
  handleRedirectCallback: () => Promise<void>;
  getTokenSilently: (opts?: any) => Promise<string>;
};

let _client: Auth0ClientLike | null = null;

function createMockClient(): Auth0ClientLike {
  let authed = false;
  let user: any = null;

  return {
    async isAuthenticated() {
      return authed;
    },
    async getUser() {
      return user;
    },
    async loginWithRedirect() {
      authed = true;
      user = user ?? { name: "Dev User" };
    },
    logout() {
      authed = false;
      user = null;
    },
    async handleRedirectCallback() {
      authed = true;
      user = user ?? { name: "Dev User" };
    },
    async getTokenSilently() {
      return "";
    },
  };
}

export async function getAuth0Client(): Promise<Auth0ClientLike> {
  if (_client) return _client;
  _client = createMockClient();
  return _client;
}

export async function getUser() {
  const c = await getAuth0Client();
  return c.getUser();
}

export async function login() {
  const c = await getAuth0Client();
  await c.loginWithRedirect();
}

export async function logout() {
  const c = await getAuth0Client();
  c.logout();
}

export async function handleCallback() {
  const c = await getAuth0Client();
  await c.handleRedirectCallback();
}

export async function getAccessToken() {
  const c = await getAuth0Client();
  return c.getTokenSilently();
}

// Router expects auth0.useAuth()
export function useAuth() {
  const state = {
    isAuthenticated: { value: false },
    user: { value: null as any },
    async loginWithRedirect() {
      await login();
      state.isAuthenticated.value = true;
      state.user.value = await getUser();
    },
    async logout() {
      await Promise.resolve();
      state.isAuthenticated.value = false;
      state.user.value = null;
    },
  };

  // Initialize once
  void (async () => {
    const c = await getAuth0Client();
    state.isAuthenticated.value = await c.isAuthenticated();
    state.user.value = await c.getUser();
  })();

  return {
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    loginWithRedirect: state.loginWithRedirect,
    logout: state.logout,
  };
}

// Default export must be a Vue Plugin so main.ts can do `app.use(auth0)`
const auth0Plugin: Plugin = {
  install(app: App) {
    // expose via globalProperties if needed later
    (app.config.globalProperties as any).$auth0 = {
      getAuth0Client,
      getUser,
      login,
      logout,
      handleCallback,
      getAccessToken,
      useAuth,
    };
  },
};

export default auth0Plugin;
