import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getLobby = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [profile, bets] = await Promise.all([
    context.supabase.from("profiles").select("id, player_name").eq("id", context.userId).single(),
    context.supabase.from("shared_bets").select("*").order("created_at", { ascending: false }).limit(1000),
  ]);
  if (profile.error || bets.error) throw new Error("Uitnodigingen konden niet worden geladen.");
  return { userId: context.userId, profile: profile.data, bets: bets.data };
});

export const invitePlayer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string().trim().min(2).max(60), what: z.string().trim().min(1).max(500), stake: z.string().trim().min(1).max(200), groupId: z.string().max(200).optional(), groupName: z.string().max(200).optional() }))
  .handler(async ({ context, data }) => {
    const player = await context.supabase.rpc("betje_find_player", { p_name: data.name });
    const recipient = player.data?.[0];
    if (player.error || !recipient) throw new Error("Geen tegenstander gevonden. Vraag je vriend om de exacte spelersnaam.");
    const result = await context.supabase.rpc("betje_invite", { p_recipient: recipient.id, p_subject: data.what, p_stake: data.stake, ...(data.groupId ? { p_group_id: data.groupId } : {}), ...(data.groupName ? { p_group_name: data.groupName } : {}) });
    if (result.error) throw new Error("Uitnodiging kon niet worden verstuurd.");
    return { id: result.data };
  });

export const respondInvitation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), accept: z.boolean() })).handler(async ({ context, data }) => {
    const result = await context.supabase.rpc("betje_respond", { p_id: data.id, p_accept: data.accept });
    if (result.error) throw new Error("Deze uitnodiging is niet meer beschikbaar.");
    return { ok: true };
  });

export const resolveSharedBet = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), won: z.boolean() })).handler(async ({ context, data }) => {
    const result = await context.supabase.rpc("betje_resolve", { p_id: data.id, p_won: data.won });
    if (result.error) throw new Error("Dit Betje is nog niet geaccepteerd of al beslist.");
    return { ok: true };
  });

export const updateSharedPayment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), url: z.string().max(2000).optional(), paid: z.boolean().optional() })).handler(async ({ context, data }) => {
    const result = await context.supabase.rpc("betje_payment", { p_id: data.id, ...(data.url ? { p_url: data.url } : {}), p_paid: data.paid ?? false });
    if (result.error) throw new Error("Afhandeling kon niet worden opgeslagen.");
    return { ok: true };
  });