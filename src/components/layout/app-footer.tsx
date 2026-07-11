import Link from "next/link";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type SocialIconProps = { className?: string };

function InstagramIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zm5.25-3.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
    </svg>
  );
}

function XIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.56l-5.14-6.71L5.2 22H1.94l8.03-9.17L1.5 2h6.72l4.64 6.15L18.244 2zm-1.15 18h1.81L7.02 3.94H5.08L17.094 20z" />
    </svg>
  );
}

function ThreadsIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.186 24h-.007C7.5 23.99 3.9 21.3 2.7 16.8c-.2-.8.3-1.6 1.1-1.8.8-.2 1.6.3 1.8 1.1 1 3.6 3.6 5.5 6.6 5.5 2.4 0 4.3-1.1 5.2-3 .6-1.2.7-2.6.4-3.9-.8.5-1.8.8-2.9.8-3.3 0-5.9-2.5-5.9-5.8S10.6 3.9 13.9 3.9c2.1 0 3.9 1.1 4.9 2.8.3-.1.6-.1.9-.1 1.7 0 3.1 1.2 3.4 2.8.5 2.5.1 5.1-1.1 7.4C20.4 20.3 16.8 24 12.186 24zM13.9 6.1c-2.1 0-3.7 1.6-3.7 3.6s1.6 3.6 3.7 3.6c1.1 0 2.1-.5 2.8-1.3.1-1.7 0-3.4-.5-4.9-.6-.6-1.4-1-2.3-1z" />
    </svg>
  );
}

function LinkedInIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.1c.5-1 1.8-2.1 3.8-2.1 4 0 4.8 2.7 4.8 6.1V23h-4v-7.1c0-1.7 0-3.9-2.4-3.9s-2.7 1.8-2.7 3.8V23h-4V8.5z" />
    </svg>
  );
}

function FacebookIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3.1l.9-3H13v-2c0-.6.4-1 1-1z" />
    </svg>
  );
}

function PinterestIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0C5.4 0 0 5.4 0 12c0 5 3.1 9.2 7.5 10.9-.1-.9-.2-2.3 0-3.3.2-.9 1.4-5.9 1.4-5.9s-.4-.7-.4-1.8c0-1.7 1-2.9 2.2-2.9 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.3 1.2.6 2.2 1.8 2.2 2.1 0 3.8-2.3 3.8-5.5 0-2.9-2.1-4.9-5-4.9-3.4 0-5.4 2.6-5.4 5.2 0 1 .4 2.1.9 2.7.1.1.1.2.1.4l-.3 1.4c0 .2-.2.3-.4.2-1.6-.7-2.6-3.1-2.6-5 0-4.1 3-7.8 8.6-7.8 4.5 0 8 3.2 8 7.5 0 4.5-2.8 8.1-6.8 8.1-1.3 0-2.6-.7-3-.1l-.8 3.1c-.3 1.1-1.1 2.5-1.7 3.4 1.3.4 2.6.6 4 .6 6.6 0 12-5.4 12-12S18.6 0 12 0z" />
    </svg>
  );
}

function BlueskyIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 10.8c-1.1-2.1-4-6.1-6.7-8C3.4 1.3 2.3 1.8 1.7 2.3.8 3.1.7 4.6.7 5.4c0 .8.4 6.6 7.3 10.1.4.2.8.4 1.2.5-.1.3-.1.6-.1.9 0 1.9.9 3.1 1.9 3.1s1.9-1.2 1.9-3.1c0-.3 0-.6-.1-.9.4-.1.8-.3 1.2-.5 6.9-3.5 7.3-9.3 7.3-10.1 0-.8-.1-2.3-1-3.1-.6-.5-1.7-1-3.6.5-2.7 1.9-5.6 5.9-6.7 8z" />
    </svg>
  );
}

function TikTokIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.6 7.2a6.5 6.5 0 0 1-3.7-1.2v7.1a5.8 5.8 0 1 1-5-5.7v2.9a2.9 2.9 0 1 0 2 2.8V1.5h2.8a3.7 3.7 0 0 0 3.7 3.7v2z" />
    </svg>
  );
}

function TwitchIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4.3 2 2 5.3v14.4h4.9V22l3.3-2.3h2.6L20.7 12V2H4.3zm14.7 9.2-2.6 2.6h-2.6l-2.3 2.3v-2.3H7.5V3.6h11.5v7.6zM14.8 6.2h1.6v4.9h-1.6V6.2zm-4.3 0H12v4.9H10.5V6.2z" />
    </svg>
  );
}

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/klirlineofficial/?hl=en",
    Icon: InstagramIcon,
  },
  {
    label: "X",
    href: "https://x.com/klirlineOffice",
    Icon: XIcon,
  },
  {
    label: "Threads",
    href: "https://www.threads.com/@klirlineofficial",
    Icon: ThreadsIcon,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/klirline-inc/",
    Icon: LinkedInIcon,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/KlirlineOfficial/61589921400915/",
    Icon: FacebookIcon,
  },
  {
    label: "Pinterest",
    href: "https://ca.pinterest.com/klirlineofficial/",
    Icon: PinterestIcon,
  },
  {
    label: "Bluesky",
    href: "https://bsky.app/profile/klirlineofficial.bsky.social",
    Icon: BlueskyIcon,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@klirlineofficial",
    Icon: TikTokIcon,
  },
  {
    label: "Twitch",
    href: "https://www.twitch.tv/klirlineofficial",
    Icon: TwitchIcon,
  },
] as const;

/** Dark ink footer — visually distinct from the light page body */
export function AppFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-t border-white/10 bg-ink px-4 py-7 text-[hsl(var(--footer-foreground))]",
        className
      )}
    >
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 text-center">
        <p className="text-sm text-white/90">
          <span className="font-semibold text-white">KlirBuild</span>
          {" développé par "}
          <Link
            href="https://www.klirline.ca/"
            className="font-medium text-accent-500 underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Klirline Inc.
          </Link>
        </p>

        <a
          href="mailto:Contact@klirline.ca"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent-300 underline-offset-2 hover:text-accent-500 hover:underline"
        >
          <Mail className="h-4 w-4" />
          Contact@klirline.ca
        </a>

        <div className="flex flex-wrap justify-center gap-4 text-xs text-ink-muted">
          <Link href="/privacy" className="hover:text-accent-500 hover:underline">
            Confidentialité
          </Link>
          <Link href="/terms" className="hover:text-accent-500 hover:underline">
            Conditions
          </Link>
          <Link
            href="https://www.klirline.ca/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent-500 hover:underline"
          >
            klirline.ca
          </Link>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Suivez Klirline
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {socialLinks.map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                title={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-ink-soft text-white/85 transition hover:border-accent-500/50 hover:bg-brand-700 hover:text-accent-500"
              >
                <Icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
