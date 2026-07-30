import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/auth/token-hash";

const findUniqueInvitation = vi.fn();
const createInvitation = vi.fn();
const findUniqueCompany = vi.fn();
const countUsers = vi.fn();
const countInvites = vi.fn();
const createAudit = vi.fn();
const createNotification = vi.fn();
const sendEmail = vi.fn();
const getBillingState = vi.fn();
const getPlan = vi.fn();
const getCompanyEmailContext = vi.fn();
const logEmail = vi.fn();

vi.mock("@/lib/auth/auth-service", () => ({
  hasDatabase: () => true,
}));

vi.mock("@/lib/billing/subscription-service", () => ({
  getBillingState: (...args: unknown[]) => getBillingState(...args),
}));

vi.mock("@/lib/billing/plans", () => ({
  getPlan: (...args: unknown[]) => getPlan(...args),
}));

vi.mock("@/lib/email/company-email", () => ({
  getCompanyEmailContext: (...args: unknown[]) => getCompanyEmailContext(...args),
}));

vi.mock("@/lib/email/email-service", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  logEmail: (...args: unknown[]) => logEmail(...args),
}));

vi.mock("@/lib/email/templates", () => ({
  inviteEmailHtml: () => "<p>invite</p>",
  inviteEmailText: () => "invite",
}));

vi.mock("@/lib/notifications/notification-service", () => ({
  createNotification: (...args: unknown[]) => createNotification(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      count: (...args: unknown[]) => countUsers(...args),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    invitation: {
      count: (...args: unknown[]) => countInvites(...args),
      create: (...args: unknown[]) => createInvitation(...args),
      findUnique: (...args: unknown[]) => findUniqueInvitation(...args),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    company: { findUnique: (...args: unknown[]) => findUniqueCompany(...args) },
    auditLog: { create: (...args: unknown[]) => createAudit(...args) },
  },
}));

import {
  createInvitation as createInvite,
  getInvitationByToken,
} from "@/lib/users/invite-service";

describe("invite token hashing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countUsers.mockResolvedValue(1);
    countInvites.mockResolvedValue(0);
    getBillingState.mockResolvedValue({ plan: "starter" });
    getPlan.mockReturnValue({ name: "Starter", maxUsers: 10 });
    findUniqueCompany.mockResolvedValue({ name: "Acme" });
    createAudit.mockResolvedValue({});
    createNotification.mockResolvedValue({});
    sendEmail.mockResolvedValue({ ok: true, delivered: true });
    getCompanyEmailContext.mockResolvedValue({ logicalFrom: "noreply@x" });
    logEmail.mockResolvedValue({});
    createInvitation.mockImplementation(async ({ data }: { data: { token: string } }) => ({
      id: "inv1",
      email: "new@example.com",
      role: "EMPLOYEE",
      token: data.token,
      expiresAt: new Date(Date.now() + 86_400_000),
    }));
  });

  it("stocke le hash et expose le brut dans l’URL", async () => {
    const result = await createInvite({
      companyId: "co_1",
      email: "new@example.com",
      role: "EMPLOYEE",
      invitedByEmail: "admin@example.com",
    });
    expect("invitation" in result).toBe(true);
    if (!("inviteUrl" in result) || !result.inviteUrl) {
      throw new Error("inviteUrl manquant");
    }
    const raw = new URL(result.inviteUrl).searchParams.get("invite");
    expect(raw).toBeTruthy();
    const stored = createInvitation.mock.calls[0]![0].data.token as string;
    expect(stored).toBe(hashOpaqueToken(raw!));
    expect(stored).not.toBe(raw);
  });

  it("lookup par hash du token fourni", async () => {
    const raw = generateOpaqueToken(24);
    findUniqueInvitation.mockResolvedValue({
      id: "inv1",
      token: hashOpaqueToken(raw),
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      company: { name: "Acme" },
    });
    const row = await getInvitationByToken(raw);
    expect(row?.id).toBe("inv1");
    expect(findUniqueInvitation).toHaveBeenCalledWith({
      where: { token: hashOpaqueToken(raw) },
      include: { company: { select: { name: true } } },
    });
  });
});
