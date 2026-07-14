import { PublicLiveClient } from "@/components/meetings/public-live-client";

export default async function PublicLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicLiveClient slug={slug} />;
}
