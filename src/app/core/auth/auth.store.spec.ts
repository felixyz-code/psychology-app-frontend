import { AuthUser } from './auth.models';
import { AuthStore } from './auth.store';

const ACCESS_TOKEN_KEY = 'psychology_app_access_token';
const AUTH_USER_KEY = 'psychology_app_auth_user';

const user: AuthUser = {
  id: 'user-1',
  name: 'Dra. Rivera',
  email: 'rivera@example.com',
  role: 'PSYCHOLOGIST',
};

describe('AuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts anonymous when there is no persisted session', () => {
    const store = new AuthStore();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.token()).toBeNull();
    expect(store.user()).toBeNull();
  });

  it('restores a complete persisted session', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'stored-token');
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    const store = new AuthStore();

    expect(store.isAuthenticated()).toBe(true);
    expect(store.token()).toBe('stored-token');
    expect(store.user()).toEqual(user);
  });

  it('persists a session and exposes its authentication state', () => {
    const store = new AuthStore();

    store.setSession('new-token', user);

    expect(store.isAuthenticated()).toBe(true);
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('new-token');
    expect(localStorage.getItem(AUTH_USER_KEY)).toBe(JSON.stringify(user));
  });

  it('clears state and persisted data on logout', () => {
    const store = new AuthStore();
    store.setSession('active-token', user);

    store.clearSession();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it.each([
    ['corrupt user JSON', 'active-token', '{not-json'],
    ['a null user', 'active-token', 'null'],
    ['an incomplete user', 'active-token', JSON.stringify({ id: user.id, name: user.name })],
    ['a user with an unsupported role', 'active-token', JSON.stringify({ ...user, role: 'ASSISTANT' })],
    ['a missing token', null, JSON.stringify(user)],
    ['a blank token', '   ', JSON.stringify(user)],
    ['a missing user', 'active-token', null],
  ])('stays anonymous and clears storage for %s', (_description, token, storedUser) => {
    if (token !== null) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }

    if (storedUser !== null) {
      localStorage.setItem(AUTH_USER_KEY, storedUser);
    }

    expect(() => new AuthStore()).not.toThrow();

    const store = new AuthStore();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.token()).toBeNull();
    expect(store.user()).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });
});
