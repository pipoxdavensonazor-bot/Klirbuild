"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { SessionSync } from "@/components/auth/session-sync";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppFooter } from "@/components/layout/app-footer";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(26,54,93,0.05),_transparent_30%),linear-gradient(180deg,#f5f6f8_0%,#eef1f5_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(26,54,93,0.28),_transparent_32%),linear-gradient(180deg,#0a1220_0%,#040b14_100%)]">
      <SessionSync />
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <AppSidebar />
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="h-full w-64 shadow-soft">
            <AppSidebar />
          </div>
          <button
            className="flex-1 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className={cn("mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-6")}>
          {children}
        </main>
        <AppFooter />
      </div>

      <Link href="/ai" className="fixed bottom-20 right-5 z-30 lg:bottom-5">
        <Button size="lg" className="rounded-full shadow-soft">
          <Bot className="h-4 w-4" />
          Klir AI
        </Button>
      </Link>
    </div>
  );
}
