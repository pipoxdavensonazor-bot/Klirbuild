import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    company: {
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

import { findCompanyIdByStripeCustomer } from "@/lib/billing/subscription-service";

describe("findCompanyIdByStripeCustomer", () => {
  beforeEach(() => {
    findFirst.mockReset();
    process.env.DATABASE_URL = "postgresql://local/test";
  });

  it("résout le tenant par stripeCustomerId", async () => {
    findFirst.mockResolvedValue({ id: "co_real" });
    await expect(findCompanyIdByStripeCustomer("cus_123")).resolves.toBe("co_real");
    expect(findFirst).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      select: { id: true },
    });
  });

  it("retourne null si le client Stripe est inconnu", async () => {
    findFirst.mockResolvedValue(null);
    await expect(findCompanyIdByStripeCustomer("cus_missing")).resolves.toBeNull();
  });
});