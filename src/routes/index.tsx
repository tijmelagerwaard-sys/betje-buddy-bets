import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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

type Bet = { id: string; what: string; stake: string; friend: string; delta: number };
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
  const [stake, setStake] = useState<string>(STAKES[0]!);
  const [friend, setFriend] = useState<string>(FRIENDS[0]!);

  useEffect(() => {
    const s = localStorage.getItem("betje");
    if (s) setBets(JSON.parse(s));
  }, []);
  const save = (b: Bet[]) => { setBets(b); localStorage.setItem("betje", JSON.stringify(b)); };

  const send = () => {
    if (!what.trim()) return;
    save([{ id: Date.now().toString(), what, stake, friend, delta: 0 }, ...bets]);
    setScreen("done");
  };
  const settle = (id: string, delta: number) => save(bets.map((b) => (b.id === id ? { ...b, delta } : b)));

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">betje<span className="text-ink">.</span></h1>
        {screen !== "home" && (
          <button onClick={() => setScreen("home")} className="rounded-full bg-muted px-4 py-2 font-bold">✕</button>
        )}
      </header>

      {screen === "home" && (
        <>
          <section className="rounded-3xl bg-ink p-5 text-ink-foreground">
            <p className="text-sm opacity-70">Jouw tab</p>
            <p className="text-3xl font-extrabold">
              {bets.filter((b) => b.delta > 0).length} gewonnen · {bets.filter((b) => b.delta < 0).length} verloren
            </p>
          </section>
          <h2 className="mb-3 mt-6 text-lg font-bold">Wie heeft wat open?</h2>
          <ul className="flex flex-col gap-3">
            {bets.map((b) => (
              <li key={b.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{b.friend}</span>
                  <span className={`font-extrabold ${b.delta > 0 ? "text-success" : b.delta < 0 ? "text-danger" : "text-muted-foreground"}`}>
                    {b.delta > 0 ? "+" : b.delta < 0 ? "−" : "⏳ "}{b.stake}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">“{b.what}”</p>
                {b.delta === 0 && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => settle(b.id, 1)} className="flex-1 rounded-xl bg-secondary py-2 text-sm font-bold">🏆 Gewonnen</button>
                    <button onClick={() => settle(b.id, -1)} className="flex-1 rounded-xl bg-muted py-2 text-sm font-bold">😩 Verloren</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="h-28" />
          <div className="fixed inset-x-0 bottom-6 mx-auto max-w-md px-5">
            <button onClick={() => { setWhat(""); setScreen("new"); }} className="btn-pop w-full rounded-3xl bg-primary py-5 text-xl font-extrabold text-primary-foreground">
              ⚡ Nieuw Betje
            </button>
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
          <Chips label="Inzet" items={STAKES} value={stake} onChange={setStake} />
          <Chips label="Tegen wie?" items={FRIENDS.map((f) => (f.startsWith("📣") ? f : "@" + f))}
            value={friend.startsWith("📣") ? friend : "@" + friend} onChange={(v) => setFriend(v.replace("@", ""))} />
          <button onClick={send} disabled={!what.trim()} className="btn-pop mt-auto w-full rounded-3xl bg-primary py-5 text-xl font-extrabold text-primary-foreground disabled:opacity-50">
            Verstuur Betje 🚀
          </button>
        </div>
      )}

      {screen === "done" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="animate-pop flex h-32 w-32 items-center justify-center rounded-full bg-primary text-6xl text-primary-foreground">✓</div>
          <h2 className="mt-6 text-3xl font-extrabold">Betje staat vast!</h2>
          <p className="mt-2 text-muted-foreground">{stake} tegen {friend} — “{what}”</p>
          <button onClick={() => setScreen("home")} className="btn-pop mt-8 rounded-3xl bg-primary px-10 py-4 font-extrabold text-primary-foreground">Naar de tab</button>
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
          <button key={i} onClick={() => onChange(i)}
            className={`rounded-full border-2 px-4 py-3 font-bold transition ${value === i ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}
