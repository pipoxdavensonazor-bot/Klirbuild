import { toDisplayHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

export function RichHtml({
  html,
  className,
}: {
  html: string | null | undefined;
  className?: string;
}) {
  const content = toDisplayHtml(html);
  if (!content) return null;
  return (
    <div
      className={cn("rich-html leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
