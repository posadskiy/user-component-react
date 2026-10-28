import type { SxProps, Theme } from '@mui/material';

export interface User {
  id: number;
  email: string;
  emailVerified: boolean;
  pictureUrl?: string;
  createdVia: string;
  authProviders: string[];
}

export interface UserUrls {
  /**
   * Path or absolute URL used for GET and DELETE when a method does not set its own.
   * `{userId}` is replaced with the encoded id. Default: `/v0/user/{userId}`.
   * An absolute `http` or `https` URL is called as-is. Any other value is appended to `apiUrl`.
   */
  user?: string;
  /** GET path or absolute URL. Falls back to `user`. */
  get?: string;
  /** DELETE path or absolute URL. Falls back to `user`. */
  delete?: string;
  /**
   * POST path or absolute URL for resending the confirmation email.
   * `{userId}` is URL-encoded when present. Default: `/account/verification-email`.
   * The body is `{ linkOrigin }` and the response is 204.
   */
  verificationEmail?: string;
}

export interface UserServiceProps {
  apiUrl: string;
  userId: string;
  /**
   * Resource URLs. Omit this to keep `GET` and `DELETE` on `/v0/user/{userId}`.
   */
  urls?: UserUrls;
  /** Bearer token for authenticated requests to /v0/user/me and related endpoints. When omitted, requests are sent without Authorization (may get 401). */
  bearerToken?: string | null;
  /**
   * Auth-service base URL for the confirmation-email request.
   * A relative `urls.verificationEmail` is appended here. When omitted, `apiUrl` is used.
   */
  authApiUrl?: string;
  /**
   * Site origin written into the confirmation link, such as `https://grammarbar.com`.
   * A path, query, or hash is dropped. Defaults to the current page origin.
   */
  linkOrigin?: string;
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