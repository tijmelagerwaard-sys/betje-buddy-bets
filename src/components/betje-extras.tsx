import { useState } from "react";
import { BellRing, Check, ExternalLink, Import, Send, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupRanking, isMoneyStake, isOverdue, reminderText, shareMessage, validTikkieUrl, type Bet, type Group } from "@/lib/betje-extensions";

export function GroupImport({ groups, onImport }: { groups: Group[]; onImport: (group: Group) => void }) {
  const [source, setSource] = useState<Group["source"]>("WhatsApp");
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [open, setOpen] = useState(false);
  return <section className="mt-5 border-t pt-4">
    <div className="flex items-center justify-between gap-2"><h2 className="font-bold">Jouw groepen <span className="text-muted-foreground">· {groups.length}</span></h2><Button variant="ghost" onClick={() => setOpen(!open)} className="text-primary"><Import /> Importeer contacten</Button></div>
    {groups.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{groups.map(g => <span key={g.id} className="rounded-full bg-secondary px-3 py-2 text-xs font-bold"><Users className="mr-1 inline size-3" />{g.name} · {g.source}</span>)}</div>}
    {open && <div className="mt-3 space-y-3 rounded-2xl border bg-card p-4">
      <h3 className="font-bold">Groepsimport · simulatie</h3>
      <p className="text-sm text-muted-foreground">Geen toegang tot je WhatsApp- of Snapchat-contacten. Vul zelf je groep en namen in.</p>
      <div className="flex gap-2">{(["WhatsApp", "Snapchat"] as const).map(s => <Button key={s} variant={source === s ? "default" : "secondary"} onClick={() => setSource(s)} className="flex-1 rounded-full">{s}</Button>)}</div>
      <label className="block text-sm font-bold">Groepsnaam<input value={name} onChange={e => setName(e.target.value)} placeholder="Bijvoorbeeld: De vrijdagploeg" className="mt-1 w-full rounded-xl border bg-background p-3 font-normal" /></label>
      <label className="block text-sm font-bold">Contacten<input value={members} onChange={e => setMembers(e.target.value)} placeholder="Lennart, Jurriaan, Sanne" className="mt-1 w-full rounded-xl border bg-background p-3 font-normal" /></label>
      <Button disabled={!name.trim() || !members.split(",").some(n => n.trim())} onClick={() => { onImport({ id: crypto.randomUUID(), source, name: name.trim(), members: [...new Set(members.split(",").map(n => n.trim()).filter(n => n && n !== "Jij"))] }); setName(""); setMembers(""); setOpen(false); }} className="w-full rounded-xl"><Import /> Importeer groep</Button>
    </div>}
  </section>;
}

export function TikkieActions({ bet, onUpdate }: { bet: Bet; onUpdate: (patch: Partial<Bet>) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(bet.tikkieUrl ?? "");
  const [error, setError] = useState("");
  if (bet.delta === 0) return null;
  if (bet.paidAt) return <p className="mt-3 flex items-center gap-1 text-xs font-bold text-success"><Check className="size-4" /> Zelf als voldaan gemarkeerd</p>;
  if (!isMoneyStake(bet.stake)) return <div className="mt-3 border-t pt-3">
    <p className="mb-2 text-xs text-muted-foreground">Geen geldbedrag: reken onderling af, zonder Tikkie.</p>
    <Button variant="ghost" className="h-auto w-full whitespace-normal text-success" onClick={() => onUpdate({ paidAt: Date.now() })}><Check /> Zelf als voldaan markeren</Button>
  </div>;
  return <div className="mt-3 border-t pt-3">
    <Button variant="secondary" className="h-auto w-full whitespace-normal rounded-xl py-3 text-primary" onClick={() => setOpen(!open)}><Send /> {bet.delta > 0 ? "Stuur Tikkie naar verliezer(s)" : bet.tikkieUrl ? "Betaal via Tikkie" : "Vraag Tikkie op"}</Button>
    {open && <div className="mt-3 space-y-3">
      <p className="text-xs text-muted-foreground">{bet.delta > 0 ? "Maak je betaalverzoek in Tikkie en plak de link hieronder. Voor bier of broodjes kun je ook onderling afrekenen." : `Vraag ${bet.friend} om een Tikkie en plak de ontvangen link hieronder.`}</p>
      {bet.delta < 0 && <Button variant="ghost" className="h-auto w-full whitespace-normal text-primary" onClick={() => void shareMessage(`Hoi ${bet.friend}, ik heb “${bet.what}” verloren. Stuur je me een Tikkie voor ${bet.stake}?`)}><Send /> Vraag Tikkie op</Button>}
      {bet.delta > 0 && <Button asChild variant="ghost" className="text-primary"><a href="https://www.tikkie.me/" target="_blank" rel="noopener noreferrer"><ExternalLink /> Open Tikkie</a></Button>}
      <label className="block text-xs font-bold">Tikkie-betaallink<input type="url" value={url} onChange={e => { setUrl(e.target.value); setError(""); }} placeholder="https://tikkie.me/pay/…" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 font-normal" /></label>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <Button className="h-auto w-full whitespace-normal rounded-xl py-2" onClick={() => {
        if (!validTikkieUrl(url.trim())) { setError("Plak een geldige https://tikkie.me/pay/ betaallink."); return; }
        onUpdate({ tikkieUrl: url.trim() });
        if (bet.delta > 0) void shareMessage(`Hoi ${bet.friend}, “${bet.what}” is beslist. Je inzet: ${bet.stake}. Hierbij je Tikkie: ${url.trim()}`);
        else window.open(url.trim(), "_blank", "noopener,noreferrer");
      }}><Send />{bet.delta > 0 ? "Deel Tikkie" : "Betaal via Tikkie"}</Button>
      <p className="text-xs text-muted-foreground">Betje verstuurt niets zonder jouw keuze en controleert geen betalingen.</p>
      <Button variant="ghost" className="h-auto w-full whitespace-normal text-success" onClick={() => onUpdate({ paidAt: Date.now() })}><Check /> Zelf als voldaan markeren</Button>
    </div>}
  </div>;
}

export function HallOfShame({ bets, groups }: { bets: Bet[]; groups: Group[] }) {
  const [selected, setSelected] = useState("");
  const [sort, setSort] = useState<"losses" | "winRate" | "debts">("losses");
  const group = groups.find(g => g.id === selected) ?? groups[0];
  if (!group) return <section className="py-8 text-center"><Users className="mx-auto size-10 text-primary" /><h2 className="mt-4 text-2xl font-extrabold">Hall of Shame</h2><p className="mt-2 text-sm text-muted-foreground">Nog geen groepen. Importeer je eerste groep bij Jouw tab.</p></section>;
  const rows = groupRanking(bets, group).sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name));
  const count = bets.filter(b => b.groupId === group.id && b.delta !== 0).length;
  return <section className="mt-5">
    <h2 className="text-2xl font-extrabold">🏆 Hall of Shame</h2>
    <label className="mt-4 block text-sm font-bold">Groep<select value={group.id} onChange={e => setSelected(e.target.value)} className="mt-2 w-full rounded-xl border bg-card p-3">{groups.map(g => <option key={g.id} value={g.id}>{g.name} · {g.source}</option>)}</select></label>
    <div className="my-4 flex gap-1 rounded-full bg-muted p-1">{([{ key: "losses", label: "Verloren" }, { key: "winRate", label: "Win-rate" }, { key: "debts", label: "Schulden" }] as const).map(s => <Button key={s.key} onClick={() => setSort(s.key)} variant={sort === s.key ? "default" : "ghost"} className="flex-1 rounded-full px-2 text-xs">{s.label}</Button>)}</div>
    <p className="mb-3 text-xs text-muted-foreground">{count} besliste bets · Schulden = onvoldane inzetten, ook bier en broodjes.</p>
    <ul className="space-y-3">{rows.map((r, i) => <li key={r.name} className="rounded-2xl border bg-card p-4"><div className="flex items-center justify-between gap-2"><span className="font-bold"><span className="mr-2 text-primary">{i + 1}.</span>{r.name}</span><span className="font-extrabold text-primary">{sort === "winRate" ? r.played ? `${r.winRate}%` : "—" : r[sort]}</span></div><p className="mt-1 text-xs text-muted-foreground">{r.losses} verloren · {r.played ? `${r.winRate}%` : "—"} win-rate · {r.debts} openstaand</p></li>)}</ul>
    <p className="mt-4 text-xs text-muted-foreground">Alleen bets die op dit apparaat aan deze groep zijn gekoppeld tellen mee; geen gedeeld groepsklassement.</p>
  </section>;
}

export function Deurwaarder({ bets, now }: { bets: Bet[]; now: number }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const overdue = bets.filter(b => isOverdue(b, now) && !dismissed.includes(b.id));
  if (!overdue.length) return null;
  return <section className="mt-5 space-y-3" aria-label="De Deurwaarder"><h2 className="flex items-center gap-2 font-bold"><BellRing className="size-4 text-danger" /> De Deurwaarder <span className="text-danger">· {overdue.length}</span></h2>{overdue.map(b => <div key={b.id} className="rounded-2xl border border-danger/30 bg-card p-4"><div className="flex items-start gap-2"><p className="flex-1 text-sm">{reminderText(b)}</p><Button variant="ghost" size="icon" aria-label={`Verberg herinnering voor ${b.what}`} onClick={() => setDismissed([...dismissed, b.id])}><X /></Button></div><Button variant="ghost" className="mt-2 text-primary" onClick={() => void shareMessage(reminderText(b))}><Send /> Deel herinnering</Button></div>)}</section>;
}