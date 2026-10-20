export type Bet = {
  id: string;
  what: string;
  stake: string;
  friend: string;
  delta: number;
  groupId?: string;
  createdAt?: number;
  resolvedAt?: number;
  paidAt?: number;
  tikkieUrl?: string;
};

export type Group = { id: string; name: string; source: "WhatsApp" | "Snapchat"; members: string[] };
export const WEEK = 7 * 24 * 60 * 60 * 1000;

export function isOverdue(bet: Bet, now: number): boolean {
  if (bet.paidAt) return false;
  const since = bet.delta === 0 ? bet.createdAt : bet.resolvedAt;
  return typeof since === "number" && now - since > WEEK;
}

export function reminderText(bet: Bet): string {
  if (bet.delta === 0) return `🚨 DEURWAARDER: Jij en ${bet.friend}, “${bet.what}” staat al meer dan een week open. Tijd voor een uitslag, geen hoger beroep.`;
  const debtor = bet.delta > 0 ? bet.friend : "Jij";
  const creditor = bet.delta > 0 ? "jou" : bet.friend;
  return `🚨 DEURWAARDER: ${debtor}, je staat nu al meer dan een week ${bet.stake} in het krijt bij ${creditor}! Zelfs een slak had inmiddels afgerekend.`;
}

export function groupRanking(bets: Bet[], group: Group) {
  const names = [...new Set(["Jij", ...group.members, ...bets.filter(b => b.groupId === group.id).map(b => b.friend)])];
  return names.map(name => {
    const relevant = bets.filter(b => b.groupId === group.id && (name === "Jij" || b.friend === name));
    const resolved = relevant.filter(b => b.delta !== 0);
    const won = resolved.filter(b => name === "Jij" ? b.delta > 0 : b.delta < 0).length;
    const losses = resolved.length - won;
    const debts = resolved.filter(b => !b.paidAt && (name === "Jij" ? b.delta < 0 : b.delta > 0)).length;
    return { name, won, losses, debts, played: resolved.length, winRate: resolved.length ? Math.round(won / resolved.length * 100) : 0 };
  });
}

export function validTikkieUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "tikkie.me" && url.pathname.startsWith("/pay/") && url.pathname.length > 5 && !url.username && !url.password;
  } catch { return false; }
}

export async function shareMessage(text: string) {
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}