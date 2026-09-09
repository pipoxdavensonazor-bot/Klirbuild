import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[100px] w-full border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
