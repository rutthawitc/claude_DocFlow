"use strict";
// src/app/login/page.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginPage;
const login_form_server_1 = require("@/components/auth/login-form-server");
const auth_1 = require("@/auth");
const navigation_1 = require("next/navigation");
async function LoginPage() {
    // Check if user is already logged in
    const session = await (0, auth_1.auth)();
    // If already authenticated, redirect to dashboard
    if (session) {
        (0, navigation_1.redirect)("/dashboard");
    }
    return (<div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight">
            PWA Authentication System
          </h1>
        </div>
        <login_form_server_1.LoginFormServer />
      </div>
    </div>);
}
