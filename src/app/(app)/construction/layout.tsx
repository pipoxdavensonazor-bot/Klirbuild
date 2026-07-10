"use client";

import { ConstructionSubnav } from "@/modules/construction-os/components/subnav";
import { RequirePlan } from "@/components/auth/require-plan";

export default function ConstructionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequirePlan feature="construction_os" title="Construction OS — plan Growth+">
      <div>
        <ConstructionSubnav />
        {children}
      </div>
    </RequirePlan>
  );
}
