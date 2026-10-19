import type { SxProps, Theme } from '@mui/material';

export interface User {
  id: number;
  username: string;
  email: string;
  emailVerified: boolean;
  pictureUrl?: string;
  createdVia: string;
  authProviders: string[];
}

export interface UserFormData extends Omit<User, 'id' | 'emailVerified' | 'createdVia' | 'authProviders'> {}

export interface UserUrls {
  /**
   * Path or absolute URL used for GET, PUT, and DELETE when a method does not set its own.
   * `{userId}` is replaced with the encoded id. Default: `/v0/user/{userId}`.
   * An absolute `http` or `https` URL is called as-is. Any other value is appended to `apiUrl`.
   */
  user?: string;
  /** GET path or absolute URL. Falls back to `user`. */
  get?: string;
  /** PUT path or absolute URL. Falls back to `user`. */
  update?: string;
  /** DELETE path or absolute URL. Falls back to `user`. */
  delete?: string;
}

export interface UserServiceProps {
  apiUrl: string;
  userId: string;
  /**
   * Resource URLs. Omit this to keep `GET`, `PUT`, and `DELETE` on `/v0/user/{userId}`.
   */
  urls?: UserUrls;
  /** Bearer token for authenticated requests to /v0/user/me and related endpoints. When omitted, requests are sent without Authorization (may get 401). */
  bearerToken?: string | null;
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
  /**
   * Show the account-deletion action. Defaults to false.
   * The email prompt only confirms the click. The API must authorize DELETE.
   */
  allowDelete?: boolean;
  /** Optional class name for the root card. */
  className?: string;
  /** Optional MUI `sx` prop for the root card. Merged with the default layout. */
  sx?: SxProps<Theme>;
} 