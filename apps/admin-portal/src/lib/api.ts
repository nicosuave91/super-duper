import { useAuthStore } from '../stores/auth';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const auth = useAuthStore();
  await auth.init(); // Initialize auth store

  const headers = new Headers(init.headers);  // Initialize headers
  if (auth.authed) {
    const token = await auth.token();  // Get the token
    headers.set('Authorization', `Bearer ${token}`);  // Set Authorization header if user is authenticated
  }

  // Return the fetch request with the updated headers and passed init options
  return fetch(path, { ...init, headers });
}
