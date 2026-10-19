import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestTimeoutMs } from '../api';
import { UserService } from './UserService';

const { get, put, remove } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), remove: vi.fn() }));

vi.mock('axios', () => ({
  default: {
    get,
    put,
    delete: remove,
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === 'object' && (error as { isAxiosError?: boolean }).isAxiosError),
  },
}));

const profile = {
  id: 1,
  username: 'ada',
  email: 'ada@example.com',
  emailVerified: true,
  pictureUrl: 'http://cdn.example/a.png',
  createdVia: 'local',
  authProviders: ['google'],
};

function renderProfile(props: Partial<ComponentProps<typeof UserService>> = {}) {
  return render(
    <UserService apiUrl="http://localhost:8095/" userId="me/../other" bearerToken="super-secret" {...props} />,
  );
}

describe('UserService', () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
    remove.mockReset();
  });

  it('encodes the user id and does not use an http picture url', async () => {
    get.mockResolvedValue({ data: profile });
    renderProfile();

    expect(await screen.findByRole('heading', { name: 'ada' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(
      'http://localhost:8095/v0/user/me%2F..%2Fother',
      expect.objectContaining({
        headers: { Authorization: 'Bearer super-secret' },
        signal: expect.any(AbortSignal),
        timeout: requestTimeoutMs,
      }),
    );
    expect(document.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete Profile' })).not.toBeInTheDocument();
  });

  it('shows the load error and hides profile actions', async () => {
    const onError = vi.fn();
    get.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 500',
      config: { headers: { Authorization: 'Bearer super-secret' } },
      response: { status: 500, data: { token: 'super-secret' } },
    });
    renderProfile({ onError });

    expect(await screen.findByText('Unable to load the profile.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Username' })).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0][0].message).toBe('Unable to load the profile.');
    expect(JSON.stringify(onError.mock.calls[0][0])).not.toContain('super-secret');
  });

  it('hides deletion when allowDelete is false and disables save while the update is in flight', async () => {
    const user = userEvent.setup();
    get.mockResolvedValue({ data: { ...profile, pictureUrl: 'https://cdn.example/a.png' } });
    let resolvePut: (value: unknown) => void = () => undefined;
    put.mockReturnValue(new Promise((resolve) => {
      resolvePut = resolve;
    }));
    renderProfile({ allowDelete: false });

    expect(await screen.findByRole('heading', { name: 'ada' })).toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/a.png');
    expect(screen.queryByRole('button', { name: 'Delete Profile' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit Username' }));
    const submitted = user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled();
    resolvePut({ data: { ...profile, username: 'ada', pictureUrl: 'https://cdn.example/a.png' } });
    await submitted;
    expect(await screen.findByText('Username updated successfully')).toBeInTheDocument();
    expect(put).toHaveBeenCalledWith(
      'http://localhost:8095/v0/user/me%2F..%2Fother',
      { username: 'ada' },
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer super-secret',
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
        timeout: requestTimeoutMs,
      }),
    );
  });

  it('shows a load error when the profile payload is not safe to render', async () => {
    const onError = vi.fn();
    get.mockResolvedValue({
      data: { username: 'ada', email: 'ada@example.com', createdVia: { source: 'local' } },
    });
    renderProfile({ onError });

    expect(await screen.findByText('The user service returned an unexpected response.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ada' })).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0][0].message).toBe('The user service returned an unexpected response.');
  });

  it('loads and updates the profile at caller-supplied urls', async () => {
    const user = userEvent.setup();
    get.mockResolvedValue({ data: profile });
    put.mockResolvedValue({ data: { ...profile, username: 'ada' } });
    renderProfile({
      urls: {
        get: '/api/people/{userId}',
        update: 'https://accounts.example/people/{userId}',
        delete: '/api/people/{userId}',
      },
    });

    expect(await screen.findByRole('heading', { name: 'ada' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(
      'http://localhost:8095/api/people/me%2F..%2Fother',
      expect.objectContaining({
        headers: { Authorization: 'Bearer super-secret' },
        signal: expect.any(AbortSignal),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Edit Username' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(put).toHaveBeenCalledWith(
      'https://accounts.example/people/me%2F..%2Fother',
      { username: 'ada' },
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer super-secret',
          'Content-Type': 'application/json',
        },
      }),
    );
  });

  it('retries a failed load', async () => {
    const user = userEvent.setup();
    get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } });
    get.mockResolvedValueOnce({ data: profile });
    renderProfile();

    await user.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'ada' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('requires a non-blank username', async () => {
    const user = userEvent.setup();
    get.mockResolvedValue({ data: profile });
    renderProfile();

    await user.click(await screen.findByRole('button', { name: 'Edit Username' }));
    const field = screen.getByRole('textbox', { name: 'Username' });
    await user.clear(field);
    await user.type(field, '   ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Username is required.')).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('deletes the account only after the email matches', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    get.mockResolvedValue({ data: profile });
    remove.mockResolvedValue({});
    renderProfile({ allowDelete: true, onSuccess, onError });

    await user.click(await screen.findByRole('button', { name: 'Delete Profile' }));
    const email = screen.getByRole('textbox', { name: 'Email Address' });
    await user.type(email, 'wrong@example.com');
    await user.click(screen.getByRole('button', { name: 'Delete Profile' }));

    expect(await screen.findByText('Email does not match. Please enter your email address to confirm deletion.')).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();

    await user.clear(email);
    await user.type(email, 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Delete Profile' }));

    expect(await screen.findByText('Your account has been deleted successfully')).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith('Your account has been deleted successfully');
    expect(onError).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(
      'http://localhost:8095/v0/user/me%2F..%2Fother',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer super-secret',
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
        timeout: requestTimeoutMs,
      }),
    );
  });
});
