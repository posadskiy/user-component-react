import { useActionState, useEffect, useEffectEvent, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import {
  defaultVerificationEmailPath,
  deleteUser,
  fetchUser,
  isCanceled,
  resendVerificationEmail,
  safePictureUrl,
  toPublicError,
  userPaths,
  type UserRequest,
} from '../api';
import type { User, UserServiceProps } from '../types';

const defaultCardSx = {
  maxWidth: 560,
  width: { xs: 'calc(100% - 32px)', sm: '100%' },
  mx: 'auto',
  mt: 4,
};
const DELETED_MESSAGE = 'Your account has been deleted successfully';
const VERIFICATION_SENT_MESSAGE = 'Confirmation email sent.';
const verificationCooldownMs = 2 * 60 * 1000;

function verificationCooldownKey(userId: string): string {
  return `user-component-react:verification-email:${userId}`;
}

function readVerificationCooldown(userId: string): number {
  try {
    const until = Number(localStorage.getItem(verificationCooldownKey(userId)));
    return Number.isFinite(until) && until > Date.now() ? until : 0;
  } catch {
    return 0;
  }
}

function writeVerificationCooldown(userId: string, until: number): void {
  try {
    localStorage.setItem(verificationCooldownKey(userId), String(until));
  } catch {
    // The timer on this page still applies when storage is unavailable.
  }
}

function clearVerificationCooldown(userId: string): void {
  try {
    localStorage.removeItem(verificationCooldownKey(userId));
  } catch {
    // Storage can be unavailable in a private browser.
  }
}

function cooldownLabel(remainingMs: number): string {
  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `Resend in ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

type UserEndpoint = Pick<UserServiceProps, 'apiUrl' | 'userId' | 'bearerToken'> & {
  getPath: string;
  deletePath: string;
};

type ProfileView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'deleted'; message: string }
  | { status: 'ready'; user: User };

interface ActionMessage {
  error: string | null;
  sent: boolean;
}

const emptyMessage: ActionMessage = { error: null, sent: false };

function requestOf(endpoint: UserEndpoint, signal: AbortSignal | null, path: string): UserRequest {
  return {
    apiUrl: endpoint.apiUrl,
    userId: endpoint.userId,
    bearerToken: endpoint.bearerToken,
    path,
    signal: signal ?? undefined,
  };
}

function displayLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function emailInitial(email: string): string {
  const initial = email.trim().charAt(0).toUpperCase();
  return initial || '?';
}

function useUserProfile({
  apiUrl,
  userId,
  bearerToken,
  getPath,
  onError,
}: UserEndpoint & Pick<UserServiceProps, 'onError'>) {
  const [view, setView] = useState<ProfileView>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const signalRef = useRef<AbortSignal | null>(null);
  const reportError = useEffectEvent((error: unknown, fallback: string) => {
    const publicError = toPublicError(error, fallback);
    onError?.(publicError);
    return publicError;
  });

  useEffect(() => {
    const controller = new AbortController();
    signalRef.current = controller.signal;
    let ignore = false;

    setView({ status: 'loading' });

    const load = async () => {
      try {
        const user = await fetchUser({ apiUrl, userId, bearerToken, path: getPath, signal: controller.signal });
        if (ignore) return;
        setView({ status: 'ready', user });
      } catch (error) {
        if (ignore || isCanceled(error)) return;
        const publicError = reportError(error, 'Unable to load the profile.');
        setView({ status: 'error', message: publicError.message });
      }
    };

    void load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [apiUrl, userId, bearerToken, getPath, attempt]);

  return { view, setView, signalRef, retry: () => setAttempt((value) => value + 1) };
}

export function UserService({
  apiUrl,
  userId,
  bearerToken,
  authApiUrl,
  linkOrigin,
  urls,
  onError,
  onSuccess,
  allowDelete = false,
  className,
  sx,
}: UserServiceProps) {
  const paths = userPaths(urls);
  const { view, setView, signalRef, retry } = useUserProfile({
    apiUrl,
    userId,
    bearerToken,
    getPath: paths.get,
    deletePath: paths.delete,
    onError,
  });
  const endpoint: UserEndpoint = {
    apiUrl,
    userId,
    bearerToken,
    getPath: paths.get,
    deletePath: paths.delete,
  };
  const cardSx = (sx ? [defaultCardSx, sx] : defaultCardSx) as SxProps<Theme>;

  if (view.status === 'loading') {
    return <ProfileLoading />;
  }

  if (view.status === 'error') {
    return (
      <StatusCard className={className} sx={cardSx}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {view.message}
        </Alert>
        <Button type="button" variant="outlined" onClick={retry}>
          Retry
        </Button>
      </StatusCard>
    );
  }

  if (view.status === 'deleted') {
    return (
      <StatusCard className={className} sx={cardSx}>
        <Alert severity="success">{view.message}</Alert>
      </StatusCard>
    );
  }

  const { user } = view;
  const showResend = user.emailVerified === false;
  const showActions = allowDelete || showResend;
  const showFacts = hasProfileFacts(user);

  return (
    <Card className={className} sx={cardSx}>
      <CardContent>
        <Stack spacing={2.5} divider={showFacts || showActions ? <Divider /> : undefined}>
          <ProfileHeader user={user} />
          {showFacts && <ProfileFacts user={user} />}
          {showActions && (
            <AccountActions
              user={user}
              allowDelete={allowDelete}
              showResend={showResend}
              endpoint={endpoint}
              signalRef={signalRef}
              authApiUrl={authApiUrl ?? apiUrl}
              verificationPath={urls?.verificationEmail ?? defaultVerificationEmailPath}
              linkOrigin={linkOrigin}
              onDeleted={() => {
                setView({ status: 'deleted', message: DELETED_MESSAGE });
                onSuccess?.(DELETED_MESSAGE);
              }}
              onSent={() => onSuccess?.(VERIFICATION_SENT_MESSAGE)}
              onError={onError}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProfileLoading() {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}
    >
      <CircularProgress aria-label="Loading profile" />
    </Box>
  );
}

function StatusCard({ className, sx, children }: { className?: string; sx: SxProps<Theme>; children: ReactNode }) {
  return (
    <Card className={className} sx={sx}>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ProfileHeader({ user }: { user: User }) {
  const picture = safePictureUrl(user.pictureUrl);
  const [failedPicture, setFailedPicture] = useState<string | null>(null);
  const verified = user.emailVerified === true;
  const unverified = user.emailVerified === false;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar
        src={picture && failedPicture !== picture ? picture : undefined}
        alt=""
        onError={() => {
          if (picture) setFailedPicture(picture);
        }}
        sx={{ width: 56, height: 56, flexShrink: 0 }}
      >
        {emailInitial(user.email)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" component="h2" sx={{ overflowWrap: 'anywhere', lineHeight: 1.3 }}>
          {user.email}
        </Typography>
        {(verified || unverified) && (
          <Chip
            size="small"
            variant="outlined"
            color={verified ? 'success' : 'warning'}
            label={verified ? 'Verified' : 'Not verified'}
            sx={{ mt: 1 }}
          />
        )}
      </Box>
    </Box>
  );
}

function profileProviders(user: User): string[] {
  if (!Array.isArray(user.authProviders)) return [];
  return user.authProviders.filter((provider) => typeof provider === 'string' && provider.trim());
}

function hasProfileFacts(user: User): boolean {
  const createdVia = typeof user.createdVia === 'string' ? user.createdVia.trim() : '';
  return createdVia.length > 0 || profileProviders(user).length > 0;
}

function ProfileFacts({ user }: { user: User }) {
  const createdVia = typeof user.createdVia === 'string' ? displayLabel(user.createdVia) : '';
  const providers = profileProviders(user);

  return (
    <Stack spacing={2}>
      {createdVia && (
        <Fact label="Signed up">
          <Typography variant="body1">{createdVia}</Typography>
        </Fact>
      )}
      {providers.length > 0 && (
        <Fact label="Sign-in methods">
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {providers.map((provider) => (
              <Chip key={provider} label={displayLabel(provider)} size="small" variant="outlined" />
            ))}
          </Box>
        </Fact>
      )}
    </Stack>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function AccountActions({
  user,
  allowDelete,
  showResend,
  endpoint,
  signalRef,
  authApiUrl,
  verificationPath,
  linkOrigin,
  onDeleted,
  onSent,
  onError,
}: {
  user: User;
  allowDelete: boolean;
  showResend: boolean;
  endpoint: UserEndpoint;
  signalRef: RefObject<AbortSignal | null>;
  authApiUrl: string;
  verificationPath: string;
  linkOrigin?: string;
  onDeleted: () => void;
  onSent: () => void;
  onError?: (error: Error) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(() => readVerificationCooldown(endpoint.userId));
  const [now, setNow] = useState(() => Date.now());
  const remainingMs = Math.max(0, cooldownUntil - now);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return undefined;
    const id = window.setInterval(() => {
      const next = Date.now();
      if (next >= cooldownUntil) {
        window.clearInterval(id);
        clearVerificationCooldown(endpoint.userId);
        setCooldownUntil(0);
        setNow(next);
        return;
      }
      setNow(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil, endpoint.userId]);

  const [resend, submitResend, resendPending] = useActionState(
    async (previous: ActionMessage): Promise<ActionMessage> => {
      const signal = signalRef.current;
      try {
        await resendVerificationEmail(
          {
            apiUrl: authApiUrl,
            userId: endpoint.userId,
            bearerToken: endpoint.bearerToken,
            path: verificationPath,
            signal: signal ?? undefined,
          },
          linkOrigin ?? window.location.origin,
        );
        if (signal?.aborted) return previous;
        const until = Date.now() + verificationCooldownMs;
        writeVerificationCooldown(endpoint.userId, until);
        setCooldownUntil(until);
        setNow(Date.now());
        onSent();
        return { error: null, sent: true };
      } catch (error) {
        if (isCanceled(error) || signal?.aborted) return previous;
        const publicError = toPublicError(error, 'Unable to send the confirmation email.');
        onError?.(publicError);
        return { error: publicError.message, sent: false };
      }
    },
    emptyMessage,
  );

  return (
    <Stack spacing={2}>
      {resend.sent && <Alert severity="success">{VERIFICATION_SENT_MESSAGE}</Alert>}
      {resend.error && <Alert severity="error">{resend.error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
        {allowDelete && (
          <Button
            type="button"
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete account
          </Button>
        )}
        {showResend && (
          <Box component="form" action={submitResend}>
            <Button
              type="submit"
              variant="outlined"
              startIcon={resendPending ? <CircularProgress size={16} color="inherit" /> : <MarkEmailUnreadIcon />}
              disabled={resendPending || remainingMs > 0}
            >
              {resendPending ? 'Sending...' : remainingMs > 0 ? cooldownLabel(remainingMs) : 'Resend confirmation email'}
            </Button>
          </Box>
        )}
      </Box>
      {allowDelete && deleteOpen && (
        <DeleteProfileForm
          user={user}
          endpoint={endpoint}
          signalRef={signalRef}
          onClose={() => setDeleteOpen(false)}
          onDeleted={onDeleted}
          onError={onError}
        />
      )}
    </Stack>
  );
}

interface DeleteResult {
  error: string | null;
  submittedEmail: string;
}

function DeleteProfileForm({
  user,
  endpoint,
  signalRef,
  onClose,
  onDeleted,
  onError,
}: {
  user: User;
  endpoint: UserEndpoint;
  signalRef: RefObject<AbortSignal | null>;
  onClose: () => void;
  onDeleted: () => void;
  onError?: (error: Error) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [email, setEmail] = useState('');
  const [result, submit, pending] = useActionState(
    async (_previous: DeleteResult, formData: FormData): Promise<DeleteResult> => {
      const submittedEmail = String(formData.get('email') ?? '').trim();
      if (submittedEmail !== user.email.trim()) {
        return {
          error: 'Email does not match. Please enter your email address to confirm deletion.',
          submittedEmail,
        };
      }

      const signal = signalRef.current;
      try {
        await deleteUser(requestOf(endpoint, signal, endpoint.deletePath));
        if (!signal?.aborted) onDeleted();
        return { error: null, submittedEmail };
      } catch (error) {
        if (isCanceled(error) || signal?.aborted) return { error: null, submittedEmail };
        const publicError = toPublicError(error, 'Unable to delete the account.');
        onError?.(publicError);
        return { error: publicError.message, submittedEmail };
      }
    },
    { error: null, submittedEmail: '' },
  );
  const deleteError = email.trim() === result.submittedEmail ? result.error : null;
  const close = () => {
    if (!pending) onClose();
  };

  return (
    <Dialog
      open
      onClose={close}
      maxWidth="sm"
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <form action={submit}>
        <DialogTitle id={titleId}>Delete account</DialogTitle>
        <DialogContent>
          <DialogContentText id={descriptionId}>
            This permanently deletes the account and its data. Enter <strong>{user.email}</strong> to confirm.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            name="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            autoComplete="off"
            required
            error={Boolean(deleteError)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            color="error"
            variant="contained"
            disabled={pending || email.trim().length === 0}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {pending ? 'Deleting...' : 'Delete account'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
