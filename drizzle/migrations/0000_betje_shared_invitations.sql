CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name text NOT NULL DEFAULT '',
  CONSTRAINT player_name_length CHECK (char_length(player_name) BETWEEN 2 AND 60)
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE UNIQUE INDEX profiles_player_name_unique ON public.profiles (lower(player_name));
CREATE FUNCTION public.betje_create_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, player_name) VALUES (NEW.id, 'speler-' || NEW.id::text);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.betje_create_profile() FROM PUBLIC;
CREATE TRIGGER betje_profile_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.betje_create_profile();

CREATE TABLE public.shared_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id),
  sender_name text NOT NULL,
  recipient_name text NOT NULL,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 500),
  stake text NOT NULL CHECK (char_length(stake) BETWEEN 1 AND 200),
  group_id text,
  group_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  winner_id uuid,
  resolved_at timestamptz,
  paid_at timestamptz,
  tikkie_url text,
  CHECK (sender_id <> recipient_id),
  CHECK (winner_id IS NULL OR winner_id IN (sender_id, recipient_id))
);
GRANT SELECT ON public.shared_bets TO authenticated;
GRANT ALL ON public.shared_bets TO service_role;
ALTER TABLE public.shared_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY shared_bets_participant_read ON public.shared_bets FOR SELECT TO authenticated USING (auth.uid() IN (sender_id, recipient_id));
CREATE INDEX shared_bets_sender_idx ON public.shared_bets(sender_id, created_at DESC);
CREATE INDEX shared_bets_recipient_idx ON public.shared_bets(recipient_id, created_at DESC);

CREATE FUNCTION public.betje_money_stake(p_stake text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT trim(regexp_replace(p_stake, '[💶💵💷💴]', '', 'g')) ~* '^(([€$£][[:space:]]*[0-9]+([.,][0-9]{1,2})?)|([0-9]+([.,][0-9]{1,2})?[[:space:]]*(€|\$|£|euros?|eur|usd|gbp|dollars?|pond)))$';
$$;
REVOKE ALL ON FUNCTION public.betje_money_stake(text) FROM PUBLIC;

CREATE FUNCTION public.betje_find_player(p_name text) RETURNS TABLE(id uuid, player_name text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Aanmelden vereist'; END IF;
 RETURN QUERY SELECT p.id, p.player_name FROM public.profiles p WHERE lower(p.player_name) = lower(trim(p_name)) AND p.id <> auth.uid() LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.betje_find_player(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.betje_find_player(text) TO authenticated;

CREATE FUNCTION public.betje_invite(p_recipient uuid, p_subject text, p_stake text, p_group_id text DEFAULT NULL, p_group_name text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; sender_label text; recipient_label text;
BEGIN
 IF auth.uid() IS NULL OR auth.uid() = p_recipient THEN RAISE EXCEPTION 'Ongeldige tegenstander'; END IF;
 SELECT player_name INTO sender_label FROM public.profiles WHERE id = auth.uid();
 SELECT player_name INTO recipient_label FROM public.profiles WHERE id = p_recipient;
 IF sender_label IS NULL OR recipient_label IS NULL THEN RAISE EXCEPTION 'Speler niet gevonden'; END IF;
 INSERT INTO public.shared_bets(sender_id,recipient_id,sender_name,recipient_name,subject,stake,group_id,group_name)
 VALUES(auth.uid(),p_recipient,sender_label,recipient_label,trim(p_subject),trim(p_stake),p_group_id,p_group_name) RETURNING id INTO new_id;
 RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.betje_invite(uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.betje_invite(uuid,text,text,text,text) TO authenticated;

CREATE FUNCTION public.betje_respond(p_id uuid, p_accept boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Aanmelden vereist'; END IF;
 UPDATE public.shared_bets SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END, accepted_at = CASE WHEN p_accept THEN now() ELSE NULL END
 WHERE id = p_id AND recipient_id = auth.uid() AND status = 'pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Uitnodiging niet meer beschikbaar'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.betje_respond(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.betje_respond(uuid,boolean) TO authenticated;

CREATE FUNCTION public.betje_resolve(p_id uuid, p_won boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Aanmelden vereist'; END IF;
 UPDATE public.shared_bets SET winner_id = CASE WHEN p_won THEN auth.uid() WHEN sender_id = auth.uid() THEN recipient_id ELSE sender_id END, resolved_at = now()
 WHERE id = p_id AND auth.uid() IN (sender_id, recipient_id) AND status = 'accepted' AND winner_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Betje is nog niet geaccepteerd of al beslist'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.betje_resolve(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.betje_resolve(uuid,boolean) TO authenticated;

CREATE FUNCTION public.betje_payment(p_id uuid, p_url text DEFAULT NULL, p_paid boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.shared_bets;
BEGIN
 SELECT * INTO b FROM public.shared_bets WHERE id = p_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT FOUND OR auth.uid() NOT IN (b.sender_id,b.recipient_id) OR b.status <> 'accepted' OR b.winner_id IS NULL THEN RAISE EXCEPTION 'Betje niet beschikbaar'; END IF;
 IF p_url IS NOT NULL AND (NOT public.betje_money_stake(b.stake) OR p_url !~ '^https://tikkie[.]me/pay/[^[:space:]]+$') THEN RAISE EXCEPTION 'Alleen een geldige Tikkie-link bij een geldbedrag'; END IF;
 UPDATE public.shared_bets SET tikkie_url = coalesce(p_url,tikkie_url), paid_at = CASE WHEN p_paid THEN now() ELSE paid_at END WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.betje_payment(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.betje_payment(uuid,text,boolean) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_bets;