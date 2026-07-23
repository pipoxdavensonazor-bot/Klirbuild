import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { prisma } from "@/lib/prisma";
import { siteName } from "@/lib/utils";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await prisma.profile.findFirst();
  const name = profile?.name ?? siteName();

  return (
    <>
      <SiteHeader name={name} />
      <main>{children}</main>
      <SiteFooter
        profile={{
          name,
          phone: profile?.phone ?? "(514) 574-8712",
          email: profile?.email ?? "bienaimeleonne_@hotmail.com",
          address: profile?.address ?? "3899, aut. des Laurentides #200",
          city: profile?.city ?? "Laval (QC) H7L 3H7",
        }}
      />
    </>
  );
}
