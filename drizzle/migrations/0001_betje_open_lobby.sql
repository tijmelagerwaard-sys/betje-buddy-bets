ALTER TABLE public.shared_bets ALTER COLUMN recipient_id DROP NOT NULL;

CREATE POLICY shared_bets_lobby_read ON public.shared_bets FOR SELECT TO authenticated USING (recipient_id IS NULL AND status = 'pending');

CREATE FUNCTION public.betje_lobby_invite(p_subject text, p_stake text, p_group_id text DEFAULT NULL, p_group_name text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; sender_label text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Aanmelden vereist'; END IF;
  SELECT player_name INTO sender_label FROM public.profiles WHERE id = auth.uid();
  IF sender_label IS NULL THEN RAISE EXCEPTION 'Speler niet gevonden'; END IF;
  INSERT INTO public.shared_bets(sender_id,recipient_id,sender_name,recipient_name,subject,stake,group_id,group_name)
   VALUES(auth.uid(),NULL,sender_label,'Open Lobby',trim(p_subject),trim(p_stake),p_group_id,p_group_name) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.betje_lobby_invite(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.betje_lobby_invite(text,text,text,text) TO authenticated;

CREATE FUNCTION public.betje_claim(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimer text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Aanmelden vereist'; END IF;
  SELECT player_name INTO claimer FROM public.profiles WHERE id = auth.uid();
  IF claimer IS NULL THEN RAISE EXCEPTION 'Speler niet gevonden'; END IF;
  UPDATE public.shared_bets SET recipient_id = auth.uid(), recipient_name = claimer, status = 'accepted', accepted_at = now()
  WHERE id = p_id AND recipient_id IS NULL AND status = 'pending' AND sender_id <> auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Deze uitdaging is al geclaimd of niet meer beschikbaar'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.betje_claim(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.betje_claim(uuid) TO authenticated;