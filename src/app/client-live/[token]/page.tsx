import { ClientLivePortal } from "@/components/meetings/client-live-portal";

export default async function ClientLivePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientLivePortal token={token} />;
}
