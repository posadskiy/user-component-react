import { describe, expect, it } from 'vitest';
import { authHeaders, isUser, requestTimeoutMs, safePictureUrl, toPublicError, userPaths, userUrl } from './api';

describe('user request helpers', () => {
  it('encodes the user id and strips a trailing slash from the api url', () => {
    expect(userUrl('http://localhost:8095/', 'me/../other')).toBe(
      'http://localhost:8095/v0/user/me%2F..%2Fother',
    );
  });

  it('builds caller-supplied paths and absolute urls', () => {
    expect(userUrl('http://localhost:8095/', 'me/../other', '/api/people/{userId}')).toBe(
      'http://localhost:8095/api/people/me%2F..%2Fother',
    );
    expect(userUrl('http://localhost:8095/', 'ada', 'https://accounts.example/people/{userId}')).toBe(
      'https://accounts.example/people/ada',
    );
    expect(userUrl('http://localhost:8095/', 'ada', '/users/me')).toBe('http://localhost:8095/users/me');
    expect(userPaths({ user: '/accounts/{userId}', update: '/accounts/{userId}/name' })).toEqual({
      get: '/accounts/{userId}',
      update: '/accounts/{userId}/name',
      delete: '/accounts/{userId}',
    });
    expect(() => userUrl('http://localhost:8095/', 'ada', 'javascript:alert(1)')).toThrow(
      'User URL must be an http(s) URL or a path.',
    );
  });

  it('adds a bearer token only when the caller provided one', () => {
    expect(authHeaders(' super-secret ')).toEqual({ Authorization: 'Bearer super-secret' });
    expect(authHeaders('   ')).toEqual({});
    expect(authHeaders(null)).toEqual({});
    expect(authHeaders(undefined)).toEqual({});
  });

  it('allows only https picture urls', () => {
    expect(safePictureUrl('https://cdn.example/a.png')).toBe('https://cdn.example/a.png');
    expect(safePictureUrl('http://cdn.example/a.png')).toBeUndefined();
    expect(safePictureUrl('javascript:alert(1)')).toBeUndefined();
    expect(safePictureUrl('')).toBeUndefined();
    expect(safePictureUrl({ url: 'https://cdn.example/a.png' })).toBeUndefined();
  });

  it('replaces transport errors with a message that does not carry the request', () => {
    const error = toPublicError(
      {
        isAxiosError: true,
        message: 'Request failed with status code 500',
        config: { headers: { Authorization: 'Bearer super-secret' } },
        response: { status: 500, data: { message: 'db password=secret' } },
      },
      'Unable to load the profile.',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Unable to load the profile.');
    expect(JSON.stringify(error)).not.toContain('super-secret');
    expect(error.message).not.toContain('password');
  });

  it('accepts a user payload with username and email', () => {
    expect(isUser({ username: 'ada', email: 'ada@example.com' })).toBe(true);
    expect(isUser({ username: 'ada', email: 'ada@example.com', pictureUrl: null, createdVia: null })).toBe(true);
    expect(isUser({ username: 'ada', email: 'ada@example.com', authProviders: ['google'] })).toBe(true);
    expect(isUser({ username: 'ada' })).toBe(false);
    expect(isUser('<html>')).toBe(false);
    expect(isUser({ username: 'ada', email: 'ada@example.com', createdVia: { source: 'local' } })).toBe(false);
    expect(isUser({ username: 'ada', email: 'ada@example.com', authProviders: ['google', { name: 'x' }] })).toBe(false);
    expect(isUser({ username: 'ada', email: 'ada@example.com', pictureUrl: { url: 'https://cdn.example/a.png' } })).toBe(false);
  });

  it('replaces a timeout with a message that does not include the limit', () => {
    const error = toPublicError(
      { isAxiosError: true, code: 'ECONNABORTED', message: `timeout of ${requestTimeoutMs}ms exceeded` },
      'Unable to load the profile.',
    );

    expect(error.message).toBe('The user service took too long to respond.');
    expect(error.message).not.toContain(String(requestTimeoutMs));
  });
});
