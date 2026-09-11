-- Apply after functions.sql and migrations 001-003, on a reviewed backup.
-- Existing rows have no trustworthy owner; they remain readable but cannot be
-- reclaimed with an exposed four-digit PIN. Only an administrator may map them
-- to a verified auth user. This migration is not a live deployment command.
BEGIN;
ALTER TABLE events ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE vibe_cards ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE events ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE vibe_cards ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE events ADD COLUMN IF NOT EXISTS discord_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_linkedin text;
ALTER TABLE vibe_cards ADD COLUMN IF NOT EXISTS photo_url text;
-- PINs were public values, not credentials. Remove their use and stored values.
ALTER TABLE vibe_cards DROP COLUMN IF EXISTS pin;
DROP INDEX IF EXISTS idx_offer_embedding;
ALTER TABLE vibe_cards ALTER COLUMN need_embedding TYPE vector(768)
  USING CASE WHEN vector_dims(need_embedding)=768 THEN need_embedding::vector(768) ELSE NULL END;
ALTER TABLE vibe_cards ALTER COLUMN offer_embedding TYPE vector(768)
  USING CASE WHEN vector_dims(offer_embedding)=768 THEN offer_embedding::vector(768) ELSE NULL END;
CREATE INDEX idx_offer_embedding ON vibe_cards USING hnsw (offer_embedding vector_cosine_ops);

-- Replace all permissive policies on the four application tables.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('events','vibe_cards','matches','failed_embeds')
  LOOP EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename); END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS one_owned_card_per_event ON vibe_cards(event_id,owner_id) WHERE owner_id IS NOT NULL;
CREATE POLICY events_read ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY events_insert ON events FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid());
CREATE POLICY events_update ON events FOR UPDATE TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
-- Public networking profiles are visible to signed-in attendees, not private rooms.
CREATE POLICY cards_read ON vibe_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY cards_insert ON vibe_cards FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid());
CREATE POLICY cards_update ON vibe_cards FOR UPDATE TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE POLICY cards_delete ON vibe_cards FOR DELETE TO authenticated USING (owner_id=auth.uid());
CREATE POLICY matches_read ON matches FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM vibe_cards c WHERE c.id IN (card_a,card_b) AND c.owner_id=auth.uid()));
CREATE POLICY matches_insert ON matches FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM vibe_cards c WHERE c.id=initiator_card AND c.owner_id=auth.uid()));
CREATE POLICY matches_update ON matches FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM vibe_cards c WHERE c.id IN (card_a,card_b) AND c.id<>initiator_card AND c.owner_id=auth.uid()));
CREATE POLICY embeds_insert ON failed_embeds FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM vibe_cards c WHERE c.id=card_id AND c.owner_id=auth.uid()));
CREATE POLICY embeds_delete ON failed_embeds FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM vibe_cards c WHERE c.id=card_id AND c.owner_id=auth.uid()));

CREATE OR REPLACE FUNCTION preserve_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.id IS DISTINCT FROM OLD.id THEN
   RAISE EXCEPTION 'ownership_is_immutable';
 END IF;
 IF TG_TABLE_NAME='vibe_cards' AND to_jsonb(NEW)->>'event_id' IS DISTINCT FROM to_jsonb(OLD)->>'event_id' THEN
   RAISE EXCEPTION 'event_is_immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cards_owner BEFORE UPDATE ON vibe_cards FOR EACH ROW EXECUTE FUNCTION preserve_owner();
CREATE TRIGGER events_owner BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION preserve_owner();

CREATE OR REPLACE FUNCTION check_room_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE room events; BEGIN
 SELECT * INTO room FROM events WHERE id=NEW.event_id FOR UPDATE;
 IF NOT FOUND OR room.expires_at<=now() THEN RAISE EXCEPTION 'event_ended'; END IF;
 IF (SELECT count(*) FROM vibe_cards WHERE event_id=NEW.event_id)>=room.max_cards THEN RAISE EXCEPTION 'room_full'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION enforce_match_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a vibe_cards; b vibe_cards; BEGIN
 IF TG_OP='UPDATE' THEN
   IF OLD.status IS DISTINCT FROM 'pending' OR NEW.status IS NULL OR NEW.status NOT IN ('accepted','declined')
     OR (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN
     RAISE EXCEPTION 'invalid_match_transition';
   END IF;
   IF NOT EXISTS(SELECT 1 FROM vibe_cards c WHERE c.id IN (OLD.card_a,OLD.card_b)
     AND c.id<>OLD.initiator_card AND c.owner_id=auth.uid()) THEN RAISE EXCEPTION 'recipient_required'; END IF;
 ELSE
   SELECT * INTO a FROM vibe_cards WHERE id=NEW.card_a;
   SELECT * INTO b FROM vibe_cards WHERE id=NEW.card_b;
   IF a.id IS NULL OR b.id IS NULL OR a.id=b.id OR a.event_id IS DISTINCT FROM b.event_id
     OR NEW.initiator_card NOT IN (a.id,b.id) OR NEW.initiator_card IS NULL
     OR NEW.status IS DISTINCT FROM 'pending' OR NOT EXISTS(SELECT 1 FROM vibe_cards WHERE id=NEW.initiator_card AND owner_id=auth.uid())
     OR NOT EXISTS(SELECT 1 FROM events WHERE id=a.event_id AND expires_at>now()) THEN RAISE EXCEPTION 'invalid_match'; END IF;
   NEW.card_a_snapshot=to_jsonb(a)-ARRAY['owner_id','need_embedding','offer_embedding'];
   NEW.card_b_snapshot=to_jsonb(b)-ARRAY['owner_id','need_embedding','offer_embedding'];
 END IF;
 IF length(NEW.icebreaker)>2000 THEN RAISE EXCEPTION 'icebreaker_too_long'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER match_transition BEFORE INSERT OR UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION enforce_match_transition();

CREATE OR REPLACE FUNCTION match_cards(query_embedding vector(768), p_event_id uuid, exclude_card_id uuid, match_count int DEFAULT 3)
RETURNS TABLE(id uuid,similarity float) LANGUAGE sql SET search_path=public,pg_temp AS $$
 SELECT id,1-(offer_embedding <=> query_embedding) FROM vibe_cards
 WHERE event_id=p_event_id AND id<>exclude_card_id AND offer_embedding IS NOT NULL
 ORDER BY offer_embedding <=> query_embedding,id LIMIT greatest(1,least(coalesce(match_count,3),20));
$$;
REVOKE ALL ON events,vibe_cards,matches,failed_embeds FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON events,vibe_cards,matches,failed_embeds TO authenticated;
REVOKE EXECUTE ON FUNCTION match_cards(vector,uuid,uuid,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_cards(vector,uuid,uuid,int) TO authenticated;
COMMIT;
