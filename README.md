# User Component React

A React component for managing user information, built with Material-UI and TypeScript.

## Installation

```bash
npm install user-component-react
```

## Usage

```tsx
import { UserService } from 'user-component-react';

function App() {
  const handleError = (error: Error) => {
    // `error` is a sanitized Error. It does not include the bearer token or the raw response.
    console.error(error.message);
  };

  const handleSuccess = (message: string) => {
    console.log('Success:', message);
  };

  // Pass your JWT when the API requires authentication (optional; omit for unauthenticated requests)
  const bearerToken = 'your-jwt-token-here';

  return (
    <UserService
      apiUrl="https://your-api-url.com"
      userId="me"
      bearerToken={bearerToken}
      onError={handleError}
      onSuccess={handleSuccess}
    />
  );
}
```

## Styles

**Styles are included.** The component uses Material-UI (CSS-in-JS); wrap your app in MUI's `ThemeProvider` (and optionally `CssBaseline`) so the component is styled by default.

To override the default card layout, pass **`className`** or **`sx`** (MUI's style prop):

```tsx
<UserService
  apiUrl="..."
  userId="user123"
  className="my-profile-card"
  sx={{ maxWidth: 500, mt: 2 }}
  onError={handleError}
  onSuccess={handleSuccess}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| apiUrl | string | Yes | The base URL of your user service API |
| userId | string | Yes | The ID of the user to display/edit (use `"me"` for current user). Inserted wherever a URL contains `{userId}`. |
| urls | UserUrls | No | Paths or absolute URLs for get, update, and delete. `{userId}` is URL-encoded. Defaults to `/v0/user/{userId}` for every method. |
| bearerToken | string \| null | No | JWT for API authentication; when omitted, requests are sent without Authorization (may get 401) |
| onError | (error: Error) => void | No | Sanitized error callback. The error has no request config or token. |
| onSuccess | (message: string) => void | No | Callback for a successful update or deletion. The card also shows the message. |
| allowDelete | boolean | No | Show account deletion. Defaults to `false`. The email prompt confirms the click; the API must authorize DELETE. |
| className | string | No | Class name for the root card |
| sx | SxProps | No | MUI `sx` prop for the root card (merged with defaults) |

## Features

- View user information
- Edit user profile
- JWT authentication support
- Responsive design
- Material-UI components
- TypeScript support
- Error handling with an in-card message and retry
- Success message after username updates and account deletion
- Optional account deletion (`allowDelete`)

## API Endpoints

By default the component calls:

- GET `/v0/user/{userId}` - Fetch user information
- PUT `/v0/user/{userId}` - Update the username
- DELETE `/v0/user/{userId}` - Delete the user account

Pass `urls` to point those calls at another service. A relative path is appended to `apiUrl`. An absolute `http` or `https` URL is used as given. `{userId}` is replaced with the encoded id.

```tsx
<UserService
  apiUrl="https://api.example.com"
  userId="42"
  urls={{
    user: '/api/accounts/{userId}',
    update: '/api/accounts/{userId}/username',
  }}
/>
```

`user` applies to every method that does not set its own `get`, `update`, or `delete` URL.

When `bearerToken` is provided, all requests include the Bearer token in the `Authorization` header. Profile images are rendered only when `pictureUrl` is an `https` URL.

## Development

```bash
npm install
npm test
npm run build
```

GitHub Actions runs the same test and compile steps on pushes to `main` and `master`, and on pull requests.

## Local testing

```bash
cd example
npm install
npm run dev
```

The example opens at http://localhost:3000. Set `VITE_API_URL`, `VITE_USER_ID`, and `VITE_BEARER_TOKEN` in `example/.env` when the user service is not on `http://localhost:8095`. Wrap the example in MUI's `ThemeProvider`, which `example/src/index.tsx` already does.

## License

MIT 
