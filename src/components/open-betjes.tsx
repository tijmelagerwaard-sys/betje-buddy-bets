import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAccount, usePlayer } from "@/components/player-account";
import { respondInvitation } from "@/lib/lobby.functions";
import { canRespond } from "@/lib/betje-extensions";
import type { useLobby } from "@/hooks/use-lobby";

export function OpenBetjes({ lobby }: { lobby: ReturnType<typeof useLobby> }) {
  const { user } = usePlayer();
  const [view, setView] = useState<"incoming" | "outgoing">("incoming");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const respond = useServerFn(respondInvitation);
  const incoming = lobby.rows.filter(b => b.recipient_id === user?.id && b.status === "pending");
  const outgoing = lobby.rows.filter(b => b.sender_id === user?.id && b.status !== "accepted");
  return <section>
    <h2 className="mb-3 text-2xl font-extrabold">Open Betjes</h2>
    <PlayerAccount {...(lobby.data?.profile.player_name ? { name: lobby.data.profile.player_name } : {})} onSaved={() => void lobby.refresh()} />
    {user && <>
      <div className="my-4 flex gap-1 rounded-full bg-muted p-1"><Button variant={view === "incoming" ? "default" : "ghost"} className="flex-1 rounded-full" onClick={() => setView("incoming")}>Inkomend · {incoming.length}</Button><Button variant={view === "outgoing" ? "default" : "ghost"} className="flex-1 rounded-full" onClick={() => setView("outgoing")}>Uitstaand · {outgoing.filter(b => b.status === "pending").length}</Button></div>
      {lobby.isPending ? <p className="text-sm text-muted-foreground">Uitnodigingen laden…</p> : lobby.isError ? <div><p role="alert" className="text-sm text-danger">Uitnodigingen konden niet worden geladen.</p><Button variant="secondary" onClick={() => void lobby.refetch()}>Opnieuw proberen</Button></div> : <>
        <ul className="space-y-3">{(view === "incoming" ? incoming : outgoing).map(b => <li key={b.id} className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{view === "incoming" ? b.sender_name : b.recipient_name}</span><span className="break-words font-bold text-primary">{b.stake}</span></div>
          <p className="mt-1 break-words text-sm text-muted-foreground">“{b.subject}”</p>
          {b.group_name && <p className="mt-1 text-xs text-primary">👥 {b.group_name}</p>}
          {view === "incoming" && user && canRespond(b.status, b.recipient_id, user.id) ? <div className="mt-3 flex gap-2">{[true, false].map(accept => <Button key={String(accept)} disabled={Boolean(busy)} variant="ghost" className={`flex-1 rounded-xl ${accept ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`} onClick={async () => {
            setBusy(b.id); setError(""); try { await respond({ data: { id: b.id, accept } }); await lobby.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Antwoord kon niet worden opgeslagen."); } finally { setBusy(""); }
          }}>{accept ? "🟢 Accepteren" : "🔴 Afwijzen"}</Button>)}</div> : <p className={`mt-3 text-xs font-bold ${b.status === "rejected" ? "text-danger" : "text-muted-foreground"}`}>{b.status === "rejected" ? "Afgewezen" : "Wacht op acceptatie"}</p>}
        </li>)}</ul>
        {(view === "incoming" ? incoming : outgoing).length === 0 && <div className="py-8 text-center text-muted-foreground"><Inbox className="mx-auto mb-3 size-8" /><p>{view === "incoming" ? "Geen inkomende uitnodigingen" : "Geen uitstaande Betjes"}</p></div>}
      </>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </>}
  </section>;
}