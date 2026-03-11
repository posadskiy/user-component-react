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
    console.error('Error:', error);
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
| userId | string | Yes | The ID of the user to display/edit (use `"me"` for current user) |
| bearerToken | string \| null | No | JWT for API authentication; when omitted, requests are sent without Authorization (may get 401) |
| onError | (error: Error) => void | No | Callback function for error handling |
| onSuccess | (message: string) => void | No | Callback function for success messages |
| className | string | No | Class name for the root card |
| sx | object | No | MUI `sx` prop for the root card (merged with defaults) |

## Features

- View user information
- Edit user profile
- JWT authentication support
- Responsive design
- Material-UI components
- TypeScript support
- Error handling
- Success notifications

## API Endpoints

The component uses the following API endpoints:

- GET `/v0/user/{userId}` - Fetch user information
- PUT `/v0/user/{userId}` - Update user information
- DELETE `/v0/user/{userId}` - Delete user account

When `bearerToken` is provided, all requests include the Bearer token in the `Authorization` header.

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build
```

## Local Testing

To test this component locally with the backend:

1. **Quick Start**: See [QUICK_START.md](./QUICK_START.md) for the fastest way to get started
2. **Detailed Guide**: See [TESTING.md](./TESTING.md) for comprehensive testing instructions

### Quick Test

```bash
# 1. Start backend services
cd ../..  # Go to project root
docker-compose -f docker-compose.dev.yml up user-service auth-service

# 2. Get a JWT token from auth-service (use Swagger UI at http://localhost:8100/swagger-ui/index.html)

# 3. Start the example app
cd user-component-react/example
npm install
npm start
```

The example app will open at http://localhost:3000

## License

MIT 
