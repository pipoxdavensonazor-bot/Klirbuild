"use client";

import { SocialPublishPanel } from "@/components/admin/social-publish-panel";

export function PublishShareButtons({
  type,
  id,
}: {
  type: "article" | "property" | "seminar";
  id: string;
  published?: boolean;
}) {
  return <SocialPublishPanel type={type} id={id} compact />;
}
