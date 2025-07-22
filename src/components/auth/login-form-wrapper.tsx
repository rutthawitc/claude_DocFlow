// src/components/auth/login-form-wrapper.tsx

import { LoginFormServer } from "./login-form-server";

export async function LoginFormWrapper() {
  // Generate a random CSRF token (doesn't set cookies anymore)
  // const csrfToken = await generateCsrfToken();

  return <LoginFormServer />;
}
