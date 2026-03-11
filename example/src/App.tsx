import { UserService } from 'user-component-react';

function App() {
  const handleError = (error: Error) => {
    console.error('Error:', error);
  };

  const handleSuccess = (message: string) => {
    console.log('Success:', message);
  };

  // For local testing: set VITE_BEARER_TOKEN, VITE_API_URL, VITE_USER_ID in .env
  // or ensure user-service is running on localhost:8095 and get a JWT from auth-service
  const bearerToken = import.meta.env.VITE_BEARER_TOKEN || undefined;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8095';
  const userId = import.meta.env.VITE_USER_ID || 'me';

  return (
    <div className="App">
      <UserService
        apiUrl={apiUrl}
        userId={userId}
        bearerToken={bearerToken}
        onError={handleError}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default App; 
