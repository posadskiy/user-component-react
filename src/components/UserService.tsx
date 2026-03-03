import * as React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, VerifiedUser as VerifiedUserIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { User, UserServiceProps } from '../types';

const defaultCardSx = { maxWidth: 600, margin: '0 auto', mt: 4 };

export const UserService: React.FC<UserServiceProps> = ({
  apiUrl,
  userId,
  onError,
  onSuccess,
  className,
  sx,
}) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteEmail, setDeleteEmail] = React.useState('');
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    fetchUserData();
  }, [apiUrl, userId]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${apiUrl}/v0/user/${userId}`);
      setUser(response.data);
      setUsername(response.data.username || '');
      setImageError(false);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        `${apiUrl}/v0/user/${userId}`,
        { username },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      setUser(response.data);
      setImageError(false);
      setEditing(false);
      onSuccess?.('Username updated successfully');
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setDeleteEmail('');
    setDeleteError(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeleteEmail('');
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!user) return;

    // Validate email matches
    if (deleteEmail.trim() !== user.email.trim()) {
      setDeleteError('Email does not match. Please enter your email address to confirm deletion.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await axios.delete(`${apiUrl}/v0/user/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setDeleteDialogOpen(false);
      onSuccess?.('Your account has been deleted successfully');
      // Optionally redirect or clear user data
      setUser(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      setDeleteError(errorMessage);
      onError?.(error as Error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card className={className} sx={{ ...defaultCardSx, ...sx }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={3}>
          <Avatar
            src={user?.pictureUrl && user.pictureUrl.trim() && !imageError ? user.pictureUrl : undefined}
            onError={() => setImageError(true)}
            sx={{ width: 64, height: 64, mr: 2 }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5" component="h2">
              {user?.username}
            </Typography>
            {user?.emailVerified && (
              <Box display="flex" alignItems="center" mt={0.5}>
                <VerifiedUserIcon sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
                <Typography variant="caption" color="success.main">
                  Email Verified
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {editing ? (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={username}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditing(false);
                      setUsername(user?.username || '');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                  >
                    Save
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" color="textSecondary">
                  Username
                </Typography>
                <Typography variant="body1">{user?.username}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" color="textSecondary">
                  Email
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1">{user?.email}</Typography>
                  {user?.emailVerified && (
                    <VerifiedUserIcon sx={{ fontSize: 18, color: 'success.main' }} />
                  )}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" color="textSecondary">
                  Created Via
                </Typography>
                <Typography variant="body1" textTransform="capitalize">
                  {user?.createdVia}
                </Typography>
              </Grid>
              {user?.authProviders && user.authProviders.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" color="textSecondary" mb={1}>
                    Auth Providers
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {user.authProviders.map((provider) => (
                      <Chip
                        key={provider}
                        label={provider}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
            <Box display="flex" justifyContent="space-between" mt={2}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
              >
                Delete Profile
              </Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => {
                  setEditing(true);
                  setUsername(user?.username || '');
                }}
              >
                Edit Username
              </Button>
            </Box>
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Profile</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This action cannot be undone. This will permanently delete your account and all associated data.
              <br />
              <br />
              To confirm, please enter your email address: <strong>{user?.email}</strong>
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
              fullWidth
              variant="outlined"
              value={deleteEmail}
              onChange={(e) => {
                setDeleteEmail(e.target.value);
                setDeleteError(null);
              }}
              disabled={deleting}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={deleting || !deleteEmail.trim()}
              startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              {deleting ? 'Deleting...' : 'Delete Profile'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}; 