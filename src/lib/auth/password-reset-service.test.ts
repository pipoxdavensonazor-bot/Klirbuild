import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueUser = vi.fn();
const createToken = vi.fn();
const updateManyTokens = vi.fn();
const findUniqueToken = vi.fn();
const updateUser = vi.fn();
const updateToken = vi.fn();
const transaction = vi.fn();
const sendEmail = vi.fn();

vi.mock("@/lib/auth/auth-service", () => ({
  hasDatabase: () => true,
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn(async () => "hashed-password"),
}));

vi.mock("@/lib/email/email-service", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueUser(...args),
      update: (...args: unknown[]) => updateUser(...args),
    },
    passwordResetToken: {
      create: (...args: unknown[]) => createToken(...args),
      updateMany: (...args: unknown[]) => updateManyTokens(...args),
      findUnique: (...args: unknown[]) => findUniqueToken(...args),
      update: (...args: unknown[]) => updateToken(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import {
  generateResetToken,
  hashResetToken,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/auth/password-reset-service";

describe("password reset token hashing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateManyTokens.mockResolvedValue({ count: 0 });
    createToken.mockResolvedValue({ id: "t1" });
    sendEmail.mockResolvedValue({ ok: true });
    transaction.mockImplementation(async (ops: unknown[]) => ops);
  });

  it("hashResetToken est déterministe et différent du brut", () => {
    const raw = "a".repeat(64);
    const hash = hashResetToken(raw);
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(raw);
    expect(hashResetToken(raw)).toBe(hash);
    expect(hashResetToken("b".repeat(64))).not.toBe(hash);
  });

  it("stocke uniquement le hash, envoie le brut dans le lien", async () => {
    findUniqueUser.mockResolvedValue({
      id: "u1",
      email: "alex@klirline.demo",
      companyId: "co_1",
    });

    const result = await requestPasswordReset("alex@klirline.demo");
    expect(result).toEqual({ ok: true });

    expect(createToken).toHaveBeenCalledTimes(1);
    const created = createToken.mock.calls[0]![0] as {
      data: { email: string; token: string };
    };
    expect(created.data.email).toBe("alex@klirline.demo");
    expect(created.data.token).toHaveLength(64);
    // Stored value must be the hash of whatever was emailed.
    const emailedHtml = sendEmail.mock.calls[0]![0] as { html: string };
    const match = emailedHtml.html.match(/token=([a-f0-9]+)/);
    expect(match?.[1]).toBeTruthy();
    expect(created.data.token).toBe(hashResetToken(match![1]!));
    expect(created.data.token).not.toBe(match![1]);
  });

  it("réinitialise via hash du token fourni", async () => {
    const raw = generateResetToken();
    const tokenHash = hashResetToken(raw);
    findUniqueToken.mockResolvedValue({
      id: "tok1",
      email: "alex@klirline.demo",
      token: tokenHash,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    findUniqueUser.mockResolvedValue({
      id: "u1",
      email: "alex@klirline.demo",
      companyId: "co_1",
      role: "COMPANY_ADMIN",
    });

    const result = await resetPasswordWithToken(raw, "newpassword1");
    expect(result).toMatchObject({ ok: true });
    expect(findUniqueToken).toHaveBeenCalledWith({
      where: { token: tokenHash },
    });
  });

  it("refuse un token inconnu (pas de match sur le brut en base)", async () => {
    findUniqueToken.mockResolvedValue(null);
    const result = await resetPasswordWithToken(generateResetToken(), "newpassword1");
    expect(result).toEqual({ error: "Lien expiré ou invalide." });
  });
});
