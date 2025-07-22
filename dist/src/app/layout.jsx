"use strict";
// src/app/layout.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const auth_context_1 = require("@/context/auth-context");
const geistSans = (0, google_1.Geist)({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = (0, google_1.Geist_Mono)({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
exports.metadata = {
    title: "PWA Authentication System'",
    description: "NextJS 15 และ Auth.js Authentication System",
};
function RootLayout({ children, authModal, }) {
    return (<html lang="th">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <auth_context_1.AuthContextProvider>
          {children}
          {authModal}
        </auth_context_1.AuthContextProvider>
      </body>
    </html>);
}
