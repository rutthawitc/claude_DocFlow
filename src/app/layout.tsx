// src/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { AuthContextProvider } from "@/context/auth-context";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "PWA Authentication System'",
  description: "NextJS 15 และ Auth.js Authentication System",
};

export default function RootLayout({
  children,
  authModal,
}: Readonly<{
  children: React.ReactNode;
  authModal: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <AuthContextProvider>
            {children}
            {authModal}
          </AuthContextProvider>
        </Providers>
      </body>
    </html>
  );
}
