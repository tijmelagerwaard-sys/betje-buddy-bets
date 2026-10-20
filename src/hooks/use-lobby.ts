import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/components/player-account";
import { getLobby } from "@/lib/lobby.functions";
import type { Bet } from "@/lib/betje-extensions";

export function useLobby() {
  const { user } = usePlayer();
  const queryClient = useQueryClient();
  const fetchLobby = useServerFn(getLobby);
  const query = useQuery({ queryKey: ["lobby", user?.id], queryFn: () => fetchLobby(), enabled: Boolean(user) });
  useEffect(() => {
    if (!user) return;
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["lobby", user.id] }); };
    const channel = supabase.channel(`lobby-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "shared_bets" }, refresh).subscribe();
    window.addEventListener("focus", refresh);
    return () => { void supabase.removeChannel(channel); window.removeEventListener("focus", refresh); };
  }, [user?.id, queryClient]);
  const rows = user ? query.data?.bets ?? [] : [];
  const accepted: Bet[] = rows.filter(b => b.status === "accepted").map(b => ({
    id: b.id, what: b.subject, stake: b.stake,
    friend: b.sender_id === user?.id ? b.recipient_name : b.sender_name,
    delta: b.winner_id ? b.winner_id === user?.id ? 1 : -1 : 0,
    shared: true, createdAt: Date.parse(b.accepted_at ?? b.created_at),
    ...(b.group_id ? { groupId: b.group_id } : {}),
    ...(b.resolved_at ? { resolvedAt: Date.parse(b.resolved_at) } : {}),
    ...(b.paid_at ? { paidAt: Date.parse(b.paid_at) } : {}),
    ...(b.tikkie_url ? { tikkieUrl: b.tikkie_url } : {}),
  }));
  return { ...query, rows, accepted, refresh: () => queryClient.invalidateQueries({ queryKey: ["lobby", user?.id] }) };
}