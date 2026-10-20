import { describe, expect, it } from "vitest";
import { groupRanking, isOverdue, validTikkieUrl, WEEK, type Bet, type Group } from "@/lib/betje-extensions";

const bet: Bet = { id: "1", what: "Ajax wint", friend: "Lennart", stake: "💶 €5", delta: 0, createdAt: 1000, groupId: "group" };
const group: Group = { id: "group", name: "Vrienden", source: "WhatsApp", members: ["Lennart", "Sanne"] };

describe("Deurwaarder", () => {
  it("marks pending bets overdue only after more than 7 days", () => {
    expect(isOverdue(bet, 1000 + WEEK)).toBe(false);
    expect(isOverdue(bet, 1001 + WEEK)).toBe(true);
  });
  it("counts unpaid debt from the result and excludes paid debt", () => {
    const resolved = { ...bet, delta: 1, resolvedAt: 2000 };
    expect(isOverdue(resolved, 2000 + WEEK)).toBe(false);
    expect(isOverdue(resolved, 2001 + WEEK)).toBe(true);
    expect(isOverdue({ ...resolved, paidAt: 3000 }, 2001 + WEEK)).toBe(false);
  });
  it("does not invent an age for existing undated bets", () => {
    expect(isOverdue({ ...bet, createdAt: undefined }, Date.now())).toBe(false);
  });
});

describe("Group ranking", () => {
  it("ranks losses, win rate and debts only within the chosen group", () => {
    const rows = groupRanking([
      { ...bet, delta: 1 },
      { ...bet, id: "2", delta: -1, paidAt: 2000 },
      { ...bet, id: "3", friend: "Sanne", delta: 1, paidAt: 2000 },
      { ...bet, id: "4", delta: -1, groupId: "other" },
    ], group);
    expect(rows.find(r => r.name === "Jij")).toMatchObject({ won: 2, losses: 1, debts: 0, winRate: 67 });
    expect(rows.find(r => r.name === "Lennart")).toMatchObject({ won: 1, losses: 1, debts: 1, winRate: 50 });
    expect(rows.find(r => r.name === "Sanne")).toMatchObject({ losses: 1, debts: 0 });
  });
});

describe("Tikkie links", () => {
  it("only accepts HTTPS payment links on tikkie.me", () => {
    expect(validTikkieUrl("https://tikkie.me/pay/example")).toBe(true);
    expect(validTikkieUrl("https://tikkie.me.evil.example/pay/example")).toBe(false);
    expect(validTikkieUrl("http://tikkie.me/pay/example")).toBe(false);
    expect(validTikkieUrl("javascript:alert(1)")).toBe(false);
  });
});