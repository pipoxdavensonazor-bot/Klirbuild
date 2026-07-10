import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(26,54,93,0.08),_transparent_42%),linear-gradient(180deg,#f5f6f8,#e8ecf1)] dark:bg-slate-950">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <KlirBuildLogo className="mb-3 h-[80px] w-[220px]" priority />
            <CardTitle>Reset password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="email" placeholder="Email" />
            <Button className="w-full">Send reset link</Button>
            <Link
              href="/login"
              className="block text-center text-xs text-brand-600 hover:underline"
            >
              Back to login
            </Link>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
