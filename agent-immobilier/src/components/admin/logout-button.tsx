"use client";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="text-slate-500 hover:text-[#C9A227]"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        window.location.href = "/admin/login";
      }}
    >
      Déconnexion
    </button>
  );
}
