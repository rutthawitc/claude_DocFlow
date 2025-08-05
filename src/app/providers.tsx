"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  // Two-pass rendering strategy to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      suppressHydrationWarning
    >
      {isClient && <Toaster position="top-right" richColors closeButton />}
      {children}
    </ThemeProvider>
  );
}
