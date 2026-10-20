import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import "@lovable.dev/cloud-auth-js/styles.css";

const PlayerContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export function usePlayer() { return useContext(PlayerContext); }
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let live = true;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      setUser(session?.user ?? null);
      setReady(true);
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) {
        void router.invalidate();
        if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
      }
    });
    void supabase.auth.getUser().then(({ data }) => { if (live) { setUser(data.user); setReady(true); } });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, [queryClient, router]);
  return <PlayerContext.Provider value={{ user, ready }}>{children}</PlayerContext.Provider>;
}

export function PlayerAccount({ name, onSaved }: { name?: string; onSaved?: () => void }) {
  const { user, ready } = usePlayer();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!ready) return <p className="py-6 text-sm text-muted-foreground">Account laden…</p>;
  const field = "mt-1 w-full rounded-xl border bg-card p-3 font-normal";
  if (user) return <div className="space-y-3 border-b pb-4">
    <p className="font-bold">Speler: {name ?? "…"}</p>
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); const result = await supabase.from("profiles").update({ player_name: playerName.trim() }).eq("id", user.id); setMessage(result.error ? "Naam niet beschikbaar; kies een unieke spelersnaam." : "Spelersnaam opgeslagen."); setBusy(false); if (!result.error) onSaved?.(); }}>
      <label className="block text-sm font-bold">Spelersnaam<input minLength={2} maxLength={60} required value={playerName} placeholder={name ?? "Kies je naam"} onChange={e => setPlayerName(e.target.value)} className={field} /></label>
      <Button disabled={busy} variant="secondary" className="mt-2 rounded-full">Naam opslaan</Button>
    </form>
    <Button variant="ghost" onClick={async () => { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); setMessage(""); }}>Uitloggen</Button>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>;
  return <div className="space-y-3 py-4">
    <h2 className="text-xl font-extrabold">{mode === "signup" ? "Spelersaccount maken" : mode === "reset" ? "Wachtwoord vergeten" : "Aanmelden voor Open Betjes"}</h2>
    <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage("");
      try {
        if (mode === "signup") {
          const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
          setMessage(result.error ? "Account maken mislukt. Controleer je gegevens en probeer opnieuw." : "Controleer je e-mail om je account te bevestigen; kies daarna je spelersnaam.");
        } else if (mode === "reset") {
          const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
          setMessage(result.error ? "Herstelmail aanvragen mislukt." : "Als dit account bestaat, ontvang je een herstelmail.");
        } else {
          const result = await supabase.auth.signInWithPassword({ email, password });
          if (result.error) setMessage("Aanmelden mislukt. Controleer je gegevens en e-mailbevestiging.");
        }
      } catch { setMessage("Aanmelden is nu niet beschikbaar. Probeer opnieuw."); }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm font-bold">E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={field} autoComplete="email" /></label>
      {mode !== "reset" && <label className="block text-sm font-bold">Wachtwoord<input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} className={field} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>}
      <Button disabled={busy} className="w-full rounded-xl">{mode === "signup" ? "Account maken" : mode === "reset" ? "Stuur herstelmail" : "Aanmelden"}</Button>
    </form>
    <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>{mode === "signup" ? "Ik heb al een account" : "Account maken"}</Button><Button variant="ghost" onClick={() => { setMode(mode === "reset" ? "login" : "reset"); setMessage(""); }}>{mode === "reset" ? "Terug" : "Wachtwoord vergeten?"}</Button></div>
    <Button variant="secondary" className="w-full rounded-xl" onClick={async () => { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (result.error) setMessage("Aanmelden met Google mislukt."); }}>Doorgaan met Google</Button>
    <Button className="lovable-auth-button w-full" onClick={async () => { const result = await lovable.auth.signInWithOAuth("lovable", { redirect_uri: window.location.origin }); if (result.error) setMessage("Aanmelden met Lovable mislukt."); }}>Continue with Lovable</Button>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}