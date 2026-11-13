import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page for unauthenticated users', async () => {
  render(<App />);
  const loginButton = await screen.findByRole('button', { name: /entrar/i });
  expect(loginButton).toBeInTheDocument();
});

