import { TotpSetupPanel } from "@/components/admin/totp-setup-panel";

export const metadata = { title: "Sécurité · Admin" };

export default function AdminSecurityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Sécurité
        </h1>
        <p className="mt-2 text-slate-500">
          Double authentification pour l’accès admin. Les secrets serveur
          (mot de passe / ADMIN_SECRET) se gèrent via Cloudflare Wrangler.
        </p>
      </div>
      <TotpSetupPanel />
    </div>
  );
}
