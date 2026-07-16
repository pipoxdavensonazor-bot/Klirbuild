import Link from "next/link";

type ProfileBits = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
};

export function SiteFooter({ profile }: { profile: ProfileBits }) {
  return (
    <footer className="border-t border-slate-800 bg-[#0B1220] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl text-white">
            {profile.name}
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Courtière immobilière · PROPRIO DIRECT · OACIQ
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p>
            <a href={`tel:${profile.phone}`} className="hover:text-[#C9A227]">
              {profile.phone}
            </a>
          </p>
          <p>
            <a href={`mailto:${profile.email}`} className="hover:text-[#C9A227]">
              {profile.email}
            </a>
          </p>
          <p>
            {profile.address}
            <br />
            {profile.city}
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/proprietes" className="hover:text-[#C9A227]">
            Propriétés
          </Link>
          <Link href="/a-propos" className="hover:text-[#C9A227]">
            À propos
          </Link>
          <Link href="/contact" className="hover:text-[#C9A227]">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
