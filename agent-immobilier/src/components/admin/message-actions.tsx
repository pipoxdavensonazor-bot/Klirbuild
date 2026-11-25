"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";

export function MessageActions({
  id,
  read,
  email,
  subject,
}: {
  id: string;
  read: boolean;
  email: string;
  subject: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markRead() {
    setPending(true);
    await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!read ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={markRead}
        >
          {pending ? "…" : "Marquer lu"}
        </Button>
      ) : null}
      <Button asChild variant="gold" size="sm">
        <a href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${subject}`)}`}>
          Répondre
        </a>
      </Button>
      <DeleteButton
        endpoint="/api/messages"
        id={id}
        label={subject}
        confirmLabel="Supprimer ce message ?"
      />
    </div>
  );
}
