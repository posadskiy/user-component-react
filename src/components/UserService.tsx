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
  Grid,
  TextField,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import {
  deleteUser,
  fetchUser,
  isCanceled,
  safePictureUrl,
  toPublicError,
  updateUsername,
  userPaths,
  type UserRequest,
} from '../api';
import type { User, UserServiceProps } from '../types';

const defaultCardSx = { maxWidth: 600, margin: '0 auto', mt: 4 };
const UPDATED_MESSAGE = 'Username updated successfully';
const DELETED_MESSAGE = 'Your account has been deleted successfully';

type UserEndpoint = Pick<UserServiceProps, 'apiUrl' | 'userId' | 'bearerToken'> & {
  getPath: string;
  updatePath: string;
  deletePath: string;
};

type ProfileView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'deleted'; message: string }
  | { status: 'ready'; user: User; notice: string | null; editing: boolean };

interface ActionMessage {
  error: string | null;
}

const emptyMessage: ActionMessage = { error: null };

function requestOf(endpoint: UserEndpoint, signal: AbortSignal | null, path: string): UserRequest {
  return {
    apiUrl: endpoint.apiUrl,
    userId: endpoint.userId,
    bearerToken: endpoint.bearerToken,
    path,
    signal: signal ?? undefined,
  };
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
        setView({ status: 'ready', user, notice: null, editing: false });
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
    updatePath: paths.update,
    deletePath: paths.delete,
    onError,
  });
  const endpoint: UserEndpoint = {
    apiUrl,
    userId,
    bearerToken,
    getPath: paths.get,
    updatePath: paths.update,
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

  const { user, notice, editing } = view;

  return (
    <Card className={className} sx={cardSx}>
      <CardContent>
        <ProfileHeader user={user} />
        {notice && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}
        {editing ? (
          <UsernameForm
            endpoint={endpoint}
            signalRef={signalRef}
            initialUsername={user.username}
            onCancel={() => setView({ ...view, editing: false })}
            onUpdated={(nextUser) => {
              setView({ status: 'ready', user: nextUser, notice: UPDATED_MESSAGE, editing: false });
              onSuccess?.(UPDATED_MESSAGE);
            }}
            onError={onError}
          />
        ) : (
          <ProfileDetails
            user={user}
            allowDelete={allowDelete}
            endpoint={endpoint}
            signalRef={signalRef}
            onEdit={() => setView({ ...view, editing: true, notice: null })}
            onDeleted={() => {
              setView({ status: 'deleted', message: DELETED_MESSAGE });
              onSuccess?.(DELETED_MESSAGE);
            }}
            onError={onError}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ProfileLoading() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
      role="status"
      aria-live="polite"
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
  const initial = user.username.trim().charAt(0).toUpperCase();

  return (
    <Box display="flex" alignItems="center" mb={3}>
      <Avatar
        src={picture && failedPicture !== picture ? picture : undefined}
        alt=""
        onError={() => {
          if (picture) setFailedPicture(picture);
        }}
        sx={{ width: 64, height: 64, mr: 2 }}
      >
        {initial}
      </Avatar>
      <Box>
        <Typography variant="h5" component="h2">
          {user.username}
        </Typography>
        {user.emailVerified && (
          <Box display="flex" alignItems="center" mt={0.5}>
            <VerifiedUserIcon aria-hidden sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
            <Typography variant="caption" color="success.main">
              Email Verified
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function ProfileDetails({
  user,
  allowDelete,
  endpoint,
  signalRef,
  onEdit,
  onDeleted,
  onError,
}: {
  user: User;
  allowDelete: boolean;
  endpoint: UserEndpoint;
  signalRef: RefObject<AbortSignal | null>;
  onEdit: () => void;
  onDeleted: () => void;
  onError?: (error: Error) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const providers = Array.isArray(user.authProviders)
    ? user.authProviders.filter((provider) => typeof provider === 'string')
    : [];

  return (
    <>
      <Grid container spacing={2}>
        <ProfileField label="Username">
          <Typography variant="body1">{user.username}</Typography>
        </ProfileField>
        <ProfileField label="Email">
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body1">{user.email}</Typography>
            {user.emailVerified && (
              <VerifiedUserIcon aria-label="Email verified" sx={{ fontSize: 18, color: 'success.main' }} />
            )}
          </Box>
        </ProfileField>
        <ProfileField label="Created Via">
          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
            {typeof user.createdVia === 'string' ? user.createdVia : ''}
          </Typography>
        </ProfileField>
        {providers.length > 0 && (
          <ProfileField label="Auth Providers" labelSpacing={1}>
            <Box display="flex" gap={1} flexWrap="wrap">
              {providers.map((provider) => (
                <Chip key={provider} label={provider} size="small" variant="outlined" />
              ))}
            </Box>
          </ProfileField>
        )}
      </Grid>
      <Box display="flex" justifyContent={allowDelete ? 'space-between' : 'flex-end'} mt={2}>
        {allowDelete && (
          <Button
            type="button"
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete Profile
          </Button>
        )}
        <Button type="button" variant="contained" startIcon={<EditIcon />} onClick={onEdit}>
          Edit Username
        </Button>
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
    </>
  );
}

function ProfileField({
  label,
  children,
  labelSpacing = 0,
}: {
  label: string;
  children: ReactNode;
  labelSpacing?: number;
}) {
  return (
    <Grid item xs={12}>
      <Typography variant="subtitle1" color="text.secondary" mb={labelSpacing}>
        {label}
      </Typography>
      {children}
    </Grid>
  );
}

function UsernameForm({
  endpoint,
  signalRef,
  initialUsername,
  onCancel,
  onUpdated,
  onError,
}: {
  endpoint: UserEndpoint;
  signalRef: RefObject<AbortSignal | null>;
  initialUsername: string;
  onCancel: () => void;
  onUpdated: (user: User) => void;
  onError?: (error: Error) => void;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [result, submit, pending] = useActionState(
    async (_previous: ActionMessage, formData: FormData): Promise<ActionMessage> => {
      const nextUsername = String(formData.get('username') ?? '').trim();
      if (!nextUsername) return { error: 'Username is required.' };

      const signal = signalRef.current;
      try {
        const nextUser = await updateUsername(requestOf(endpoint, signal, endpoint.updatePath), nextUsername);
        if (signal?.aborted) return emptyMessage;
        onUpdated(nextUser);
        return emptyMessage;
      } catch (error) {
        if (isCanceled(error) || signal?.aborted) return emptyMessage;
        const publicError = toPublicError(error, 'Unable to update the username.');
        onError?.(publicError);
        return { error: publicError.message };
      }
    },
    emptyMessage,
  );

  return (
    <form action={submit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {result.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {result.error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            disabled={pending}
            error={Boolean(result.error)}
            autoComplete="username"
          />
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <Button type="button" variant="outlined" disabled={pending} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={pending}>
              {pending ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
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
        <DialogTitle id={titleId}>Delete Profile</DialogTitle>
        <DialogContent>
          <DialogContentText id={descriptionId}>
            This action cannot be undone. This will permanently delete your account and all associated data.
            <br />
            <br />
            To confirm, please enter your email address: <strong>{user.email}</strong>
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
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
            {pending ? 'Deleting...' : 'Delete Profile'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
