import { AuthUser } from './auth.models';
import { AuthStore } from './auth.store';

const AUTH_SESSION_KEY = 'psychology_app_auth_session';
const LEGACY_ACCESS_TOKEN_KEY = 'psychology_app_access_token';
const LEGACY_AUTH_USER_KEY = 'psychology_app_auth_user';

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
    localStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify({ accessToken: 'stored-token', user }),
    );

    const store = new AuthStore();

    expect(store.isAuthenticated()).toBe(true);
    expect(store.token()).toBe('stored-token');
    expect(store.user()).toEqual(user);
  });

  it('migrates a complete legacy persisted session to the canonical envelope', () => {
    localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, 'stored-token');
    localStorage.setItem(LEGACY_AUTH_USER_KEY, JSON.stringify(user));

    const store = new AuthStore();

    expect(store.isAuthenticated()).toBe(true);
    expect(store.token()).toBe('stored-token');
    expect(store.user()).toEqual(user);
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBe(
      JSON.stringify({ accessToken: 'stored-token', user }),
    );
    expect(localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_AUTH_USER_KEY)).toBeNull();
  });

  it('persists a session and exposes its authentication state', () => {
    const store = new AuthStore();

    store.setSession('new-token', user);

    expect(store.isAuthenticated()).toBe(true);
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBe(
      JSON.stringify({ accessToken: 'new-token', user }),
    );
    expect(localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_AUTH_USER_KEY)).toBeNull();
  });

  it('synchronizes a valid session from a canonical cross-tab storage event', () => {
    const sourceStore = new AuthStore();
    const observingStore = new AuthStore();

    sourceStore.setSession('new-token', user);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: AUTH_SESSION_KEY,
        newValue: localStorage.getItem(AUTH_SESSION_KEY),
        storageArea: localStorage,
      }),
    );

    expect(observingStore.isAuthenticated()).toBe(true);
    expect(observingStore.token()).toBe('new-token');
    expect(observingStore.user()).toEqual(user);
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBe(
      JSON.stringify({ accessToken: 'new-token', user }),
    );
  });

  it('clears state and persisted data on logout', () => {
    const store = new AuthStore();
    store.setSession('active-token', user);

    store.clearSession();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_AUTH_USER_KEY)).toBeNull();
  });

  it('propagates logout to another tab through the canonical storage event', () => {
    const sourceStore = new AuthStore();
    const observingStore = new AuthStore();
    sourceStore.setSession('active-token', user);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: AUTH_SESSION_KEY,
        newValue: localStorage.getItem(AUTH_SESSION_KEY),
        storageArea: localStorage,
      }),
    );
    expect(observingStore.isAuthenticated()).toBe(true);

    sourceStore.clearSession();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: AUTH_SESSION_KEY,
        newValue: null,
        storageArea: localStorage,
      }),
    );

    expect(observingStore.isAuthenticated()).toBe(false);
    expect(observingStore.user()).toBeNull();
  });

  it('does not let legacy partial storage events erase a canonical session', () => {
    const sourceStore = new AuthStore();
    const observingStore = new AuthStore();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: LEGACY_ACCESS_TOKEN_KEY,
        newValue: 'transient-token',
        storageArea: localStorage,
      }),
    );

    sourceStore.setSession('new-token', user);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: AUTH_SESSION_KEY,
        newValue: localStorage.getItem(AUTH_SESSION_KEY),
        storageArea: localStorage,
      }),
    );

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: LEGACY_AUTH_USER_KEY,
        newValue: null,
        storageArea: localStorage,
      }),
    );

    expect(observingStore.isAuthenticated()).toBe(true);
    expect(observingStore.user()).toEqual(user);
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBe(
      JSON.stringify({ accessToken: 'new-token', user }),
    );
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
      localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, token);
    }

    if (storedUser !== null) {
      localStorage.setItem(LEGACY_AUTH_USER_KEY, storedUser);
    }

    expect(() => new AuthStore()).not.toThrow();

    const store = new AuthStore();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.token()).toBeNull();
    expect(store.user()).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_AUTH_USER_KEY)).toBeNull();
  });

  it('fails closed for corrupt canonical persisted state', () => {
    localStorage.setItem(AUTH_SESSION_KEY, '{not-json');

    const store = new AuthStore();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
  });
});
