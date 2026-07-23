import { Suspense } from "react";
import { Barlow_Condensed } from "next/font/google";
import { LoginForm } from "@/components/auth/login-form";

const loginDisplay = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-login-display",
  display: "swap",
});

export default function LoginPage() {
  return (
    <div className={loginDisplay.variable}>
      <Suspense
        fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#C9D3E0] p-8 text-sm text-brand-900">
              Chargement du chantier…
            </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
