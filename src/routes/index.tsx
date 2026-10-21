import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Deurwaarder, GroupImport, HallOfShame, TikkieActions } from "@/components/betje-extras";
import { OpenBetjes } from "@/components/open-betjes";
import { useLobby } from "@/hooks/use-lobby";
import { resolveSharedBet, updateSharedPayment } from "@/lib/lobby.functions";
import { isOverdue, type Bet, type Group } from "@/lib/betje-extensions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Betje — Wed in 5 seconden met je vrienden" },
      { name: "description", content: "Sluit informele weddenschappen af in de kroeg en houd bij wie wat open heeft staan." },
      { property: "og:title", content: "Betje — Wed in 5 seconden" },
      { property: "og:description", content: "Biertjes, broodjes of euro's: Betje houdt de tab bij." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

const STAKES = ["🍺 1 Bier", "🚬 2 Cigs", "🥪 Kantinebroodje", "💶 €5"];
const FRIENDS = ["Lennart", "Jurriaan", "Sanne", "Daan", "📣 De Groep"];
const SEED: Bet[] = [
  { id: "1", what: "Ajax wint", stake: "🍺 2 Biertjes", friend: "Lennart", delta: 1 },
  { id: "2", what: "Jurriaan wordt afgewezen", stake: "🥪 1 Broodje", friend: "Jurriaan", delta: -1 },
  { id: "3", what: "Eerst thuis", stake: "💶 €5", friend: "Sanne", delta: 1 },
];

function App() {
  const [screen, setScreen] = useState<"home" | "new" | "done">("home");
  const [bets, setBets] = useState<Bet[]>(SEED);
  const [what, setWhat] = useState("");
  const [stake, setStake] = useState<string>(STAKES[0] ?? "🍺 1 Bier");
  const [friend, setFriend] = useState<string>(FRIENDS[0] ?? "Lennart");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [tab, setTab] = useState<"tab" | "shame" | "open">("tab");
  const [now, setNow] = useState(0);
  const [customStake, setCustomStake] = useState("");
  const activeGroup = groups.find(g => g.id === groupId);
  const lobby = useLobby();
  const resolveShared = useServerFn(resolveSharedBet);
  const payShared = useServerFn(updateSharedPayment);
  const allBets = [...lobby.accepted, ...bets];
  const effectiveStake = customStake.trim() || stake;

  useEffect(() => {
    try {
      const s = localStorage.getItem("betje");
      if (s) setBets(JSON.parse(s));
      const g = localStorage.getItem("betje-groups");
      if (g) setGroups(JSON.parse(g));
    } catch { /* Keep the existing examples if local data is unreadable. */ }
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const save = (b: Bet[]) => { setBets(b); localStorage.setItem("betje", JSON.stringify(b)); };

  const send = () => {
    if (!what.trim()) return;
    save([{ id: Date.now().toString(), what, stake: effectiveStake, friend, delta: 0, createdAt: Date.now(), ...(groupId ? { groupId } : {}) }, ...bets]);
    setScreen("done");
  };
  const settle = (id: string, delta: number) => {
    const target = allBets.find(b => b.id === id);
    if (target?.shared) { void resolveShared({ data: { id, won: delta > 0 } }).then(() => lobby.refresh()); return; }
    save(bets.map((b) => (b.id === id ? { ...b, delta, resolvedAt: Date.now() } : b)));
  };
  const update = (id: string, patch: Partial<Bet>) => {
    const target = allBets.find(b => b.id === id);
    if (target?.shared) { void payShared({ data: { id, ...(patch.tikkieUrl ? { url: patch.tikkieUrl } : {}), paid: Boolean(patch.paidAt) } }).then(() => lobby.refresh()); return; }
    save(bets.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">betje<span className="text-ink">.</span></h1>
        {screen !== "home" && (
          <Button variant="ghost" aria-label="Sluiten" onClick={() => setScreen("home")} className="rounded-full bg-muted px-4 py-2 font-bold">✕</Button>
        )}
      </header>

      {screen === "home" && (
        <>
          <div role="tablist" aria-label="Betje overzicht" className="mb-4 flex gap-1 rounded-full bg-muted p-1">
            <Button role="tab" aria-selected={tab === "tab"} variant={tab === "tab" ? "default" : "ghost"} onClick={() => setTab("tab")} className="flex-1 rounded-full">Jouw tab</Button>
            <Button role="tab" aria-selected={tab === "shame"} variant={tab === "shame" ? "default" : "ghost"} onClick={() => setTab("shame")} className="flex-1 rounded-full">🏆 Hall of Shame</Button>
            <Button role="tab" aria-selected={tab === "open"} variant={tab === "open" ? "default" : "ghost"} onClick={() => setTab("open")} className="flex-1 rounded-full">📬 Open Betjes</Button>
          </div>
          {tab === "tab" ? <>
          <section className="rounded-3xl bg-ink p-5 text-ink-foreground">
            <p className="text-sm opacity-70">Jouw tab</p>
            <p className="text-3xl font-extrabold">
              {bets.filter((b) => b.delta > 0).length} gewonnen · {bets.filter((b) => b.delta < 0).length} verloren
            </p>
          </section>
          <GroupImport groups={groups} onImport={g => { const next = [...groups, g]; setGroups(next); localStorage.setItem("betje-groups", JSON.stringify(next)); }} />
          <Deurwaarder bets={allBets} now={now} />
          <h2 className="mb-3 mt-6 text-lg font-bold">Wie heeft wat open?</h2>
          <ul className="flex flex-col gap-3">
            {allBets.map((b) => (
              <li key={b.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{b.friend}</span>
                  <span className={`font-extrabold ${b.delta > 0 ? "text-success" : b.delta < 0 ? "text-danger" : "text-muted-foreground"}`}>
                    {b.delta > 0 ? "+" : b.delta < 0 ? "−" : "⏳ "}{b.stake}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">“{b.what}”</p>
                {b.groupId && <p className="mt-1 text-xs font-bold text-primary">👥 {groups.find(g => g.id === b.groupId)?.name ?? "Groep"}</p>}
                {isOverdue(b, now) && <p className="mt-1 text-xs font-bold text-danger">🚨 Langer dan 7 dagen open</p>}
                {b.delta === 0 && (
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" onClick={() => settle(b.id, 1)} className="flex-1 rounded-xl bg-secondary py-2 text-sm font-bold">🏆 Gewonnen</Button>
                    <Button variant="ghost" onClick={() => settle(b.id, -1)} className="flex-1 rounded-xl bg-muted py-2 text-sm font-bold">😩 Verloren</Button>
                  </div>
                )}
                <TikkieActions bet={b} onUpdate={patch => update(b.id, patch)} />
              </li>
            ))}
          </ul>
          </> : tab === "shame" ? <HallOfShame bets={allBets} groups={groups} /> : <OpenBetjes lobby={lobby} />}
          <div className="h-28" />
          <div className="fixed inset-x-0 bottom-6 mx-auto max-w-md px-5">
            <Button onClick={() => { setWhat(""); setCustomStake(""); setGroupId(""); setScreen("new"); }} className="btn-pop h-auto w-full rounded-3xl bg-primary py-5 text-xl font-extrabold text-primary-foreground">
              ⚡ Nieuw Betje
            </Button>
          </div>
        </>
      )}

      {screen === "new" && (
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <label className="mb-2 block font-bold">Waarop wed je?</label>
            <input autoFocus value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Jurriaan wordt afgewezen"
              className="w-full rounded-2xl border-2 bg-card px-4 py-4 text-lg outline-none focus:border-primary" />
          </div>
          <Chips label="Inzet" items={STAKES} value={stake} onChange={(v) => { setStake(v); setCustomStake(""); }} />
          <div>
            <label className="mb-2 block font-bold">Of typ je eigen inzet</label>
            <input value={customStake} onChange={(e) => setCustomStake(e.target.value)} placeholder="Bijvoorbeeld: 💶 €10 of een wasbeurt"
              className="w-full rounded-2xl border-2 bg-card px-4 py-4 text-lg outline-none focus:border-primary" />
          </div>
          {groups.length > 0 && <label className="block font-bold">Koppel aan groep<select value={groupId} onChange={e => { setGroupId(e.target.value); const g = groups.find(g => g.id === e.target.value); setFriend(g?.members[0] ?? FRIENDS[0] ?? "Lennart"); }} className="mt-2 w-full rounded-2xl border-2 bg-card p-4"><option value="">Geen groep</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name} · {g.source}</option>)}</select></label>}
          <Chips label={activeGroup ? "Vertegenwoordiger / tegenstander" : "Tegen wie?"} items={(activeGroup ? activeGroup.members : FRIENDS).map((f) => (f.startsWith("📣") ? f : "@" + f))}
            value={friend.startsWith("📣") ? friend : "@" + friend} onChange={(v) => setFriend(v.replace("@", ""))} />
          {activeGroup && <p className="text-xs text-muted-foreground">De uitslag en schuld tellen voor jou en de gekozen tegenstander, niet voor alle groepsleden.</p>}
          <Button onClick={send} disabled={!what.trim()} className="btn-pop mt-auto h-auto w-full rounded-3xl bg-primary py-5 text-xl font-extrabold text-primary-foreground disabled:opacity-50">
            Verstuur Betje 🚀
          </Button>
        </div>
      )}

      {screen === "done" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="animate-pop flex h-32 w-32 items-center justify-center rounded-full bg-primary text-6xl text-primary-foreground">✓</div>
          <h2 className="mt-6 text-3xl font-extrabold">Betje staat vast!</h2>
          <p className="mt-2 text-muted-foreground">{effectiveStake} tegen {friend} — “{what}”</p>
          {activeGroup && <p className="mt-2 text-sm font-bold text-primary">👥 {activeGroup.name}</p>}
          <Button onClick={() => { setTab("tab"); setScreen("home"); }} className="btn-pop mt-8 h-auto rounded-3xl bg-primary px-10 py-4 font-extrabold text-primary-foreground">Naar de tab</Button>
          <div className="mt-auto w-full rounded-2xl border bg-card p-4 text-left text-sm">
            <span className="text-xs text-muted-foreground">Gesponsord</span>
            <p className="font-bold">Verliezer betaalt? Stuur direct een Tikkie 💸</p>
          </div>
        </div>
      )}
    </main>
  );
}

function Chips({ label, items, value, onChange }: { label: string; items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 font-bold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Button variant="ghost" aria-pressed={value === i} key={i} onClick={() => onChange(i)}
            className={`h-auto rounded-full border-2 px-4 py-3 font-bold transition ${value === i ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {i}
          </Button>
        ))}
      </div>
    </div>
  );
}
