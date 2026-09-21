import { Suspense } from "react";
import AdminLoginForm from "./login-form";

export const metadata = { title: "Connexion admin" };

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Chargement…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
