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

export interface UserServiceProps {
  apiUrl: string;
  userId: string;
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
  /** Optional class name for the root card. Overrides default styling when needed. */
  className?: string;
  /** Optional MUI `sx` prop for the root card. Merged with default styles (maxWidth, margin). */
  sx?: object;
} 