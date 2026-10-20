import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Wachtwoord herstellen — Betje" }, { name: "description", content: "Herstel het wachtwoord van je Betje-spelersaccount." },
    { property: "og:title", content: "Wachtwoord herstellen — Betje" }, { property: "og:description", content: "Veilig een nieuw wachtwoord instellen voor Betje." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: ResetPassword,
});
function ResetPassword() {
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setRecovery(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery"); }, []);
  return <main className="mx-auto min-h-screen max-w-md px-5 py-8"><h1 className="mb-6 text-3xl font-extrabold text-primary">Wachtwoord herstellen</h1>{recovery ? <form className="space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); const result = await supabase.auth.updateUser({ password }); setMessage(result.error ? "Herstellen mislukt. Vraag een nieuwe herstelmail aan." : "Je wachtwoord is opgeslagen."); setBusy(false); }}><label className="block font-bold">Nieuw wachtwoord<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border bg-card p-3" /></label><Button disabled={busy} className="w-full rounded-xl">Wachtwoord opslaan</Button></form> : <p className="text-sm text-muted-foreground">Open deze pagina via de link in je herstelmail.</p>}{message && <p role="status" className="mt-4">{message}</p>}<Button asChild variant="ghost" className="mt-4"><Link to="/">Terug naar Betje</Link></Button></main>;
}