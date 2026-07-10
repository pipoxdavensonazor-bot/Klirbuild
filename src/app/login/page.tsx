import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(26,54,93,0.1),_transparent_42%),linear-gradient(180deg,#f5f6f8,#e8ecf1)] dark:from-slate-950">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <KlirBuildLogo className="mb-3 h-[80px] w-[220px]" priority />
            <CardTitle>Connexion à KlirBuild</CardTitle>
            <p className="text-sm text-muted-foreground">
              Email/password + Google OAuth (wire Better Auth / Clerk next).
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="email" placeholder="Email" defaultValue="alex@klirline.demo" />
            <Input type="password" placeholder="Password" defaultValue="password" />
            <Link href="/dashboard" className="block">
              <Button className="w-full">Continue</Button>
            </Link>
            <Button variant="outline" className="w-full">
              Continue with Google
            </Button>
            <div className="flex justify-between text-xs text-muted-foreground">
              <Link href="/forgot-password" className="hover:underline">
                Forgot password
              </Link>
              <Link href="/register" className="hover:underline">
                Create account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
