import { MeetingRoomClient } from "@/components/meetings/meeting-room-client";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingRoomClient meetingId={id} />;
}
