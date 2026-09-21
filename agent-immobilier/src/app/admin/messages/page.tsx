import { prisma } from "@/lib/prisma";
import { MessageActions } from "@/components/admin/message-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages · Admin" };

export default async function AdminMessagesPage() {
  const messages = await prisma.message
    .findMany({ orderBy: { createdAt: "desc" } })
    .catch(() => []);
  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Messages
        </h1>
        <p className="mt-2 text-slate-500">
          Demandes reçues via le formulaire de contact.
          {unread > 0 ? ` · ${unread} non lu${unread > 1 ? "s" : ""}` : ""}
        </p>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <p className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Aucun message pour le moment.
          </p>
        ) : null}
        {messages.map((m) => (
          <article
            key={m.id}
            className={`border bg-white p-5 ${
              m.read ? "border-slate-200" : "border-[#C9A227]/50 bg-[#C9A227]/5"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">
                  {m.read ? "Lu" : "Nouveau"} ·{" "}
                  {new Date(m.createdAt).toLocaleString("fr-CA")}
                </p>
                <h2 className="mt-1 font-medium text-[#0F172A]">{m.subject}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {m.name} ·{" "}
                  <a className="text-[#C9A227] hover:underline" href={`mailto:${m.email}`}>
                    {m.email}
                  </a>
                  {m.phone ? ` · ${m.phone}` : ""}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {m.body}
                </p>
              </div>
              <MessageActions id={m.id} read={m.read} email={m.email} subject={m.subject} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
