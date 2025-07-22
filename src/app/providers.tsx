"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      // จำเป็นต้องใช้ suppressHydrationWarning เพื่อแก้ไขปัญหา Hydration error
      // เนื่องจาก ThemeProvider พยายามเปลี่ยนแปลง HTML attributes ในระหว่าง hydration
    >
      <Toaster position="top-right" richColors closeButton />
      {children}
    </ThemeProvider>
  );
}
