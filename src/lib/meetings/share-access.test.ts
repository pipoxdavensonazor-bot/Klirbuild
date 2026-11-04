import { describe, expect, it } from "vitest";
import { clientIdsForViewer, shareAllowsClient } from "@/lib/meetings/share-access";

describe("share access", () => {
  it("refuse un autre client sur une session clients", () => {
    expect(
      shareAllowsClient({
        audience: "clients",
        clientIds: ["c1"],
        clientId: "c2",
      })
    ).toBe(false);
  });

  it("accepte le client du token et masque les autres ids", () => {
    expect(
      shareAllowsClient({
        audience: "clients",
        clientIds: ["c1", "c2"],
        clientId: "c1",
      })
    ).toBe(true);
    expect(clientIdsForViewer(["c1", "c2"], "c1")).toEqual(["c1"]);
    expect(clientIdsForViewer(["c1", "c2"], "c9")).toEqual([]);
  });

  it("laisse une session publique sans lister les autres clients", () => {
    expect(
      shareAllowsClient({ audience: "public", clientIds: ["c1"], clientId: "" })
    ).toBe(true);
    expect(clientIdsForViewer(["c1"], "")).toEqual([]);
  });

  it("refuse une audience interne", () => {
    expect(
      shareAllowsClient({ audience: "company", clientIds: ["c1"], clientId: "c1" })
    ).toBe(false);
  });
});