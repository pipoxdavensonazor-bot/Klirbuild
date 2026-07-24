"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

function markNativeShell() {
  if (typeof window === "undefined") return;
  const cap = (
    window as Window & {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        getPlatform?: () => string;
      };
    }
  ).Capacitor;
  const native = Boolean(cap?.isNativePlatform?.());
  const root = document.documentElement;
  root.classList.toggle("capacitor-native", native);
  root.classList.toggle("capacitor-android", native && cap?.getPlatform?.() === "android");
  root.classList.toggle("capacitor-ios", native && cap?.getPlatform?.() === "ios");
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    markNativeShell();
    // Capacitor may inject after first paint
    const t = window.setTimeout(markNativeShell, 50);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
    </ThemeProvider>
  );
}
