import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {vector} from '@electric-sql/pglite-pgvector'

test('real PostgreSQL policies enforce ownership, match transitions and capacity',async()=>{
 const db=new PGlite({extensions:{vector}})
 try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated;`)
 for(const file of ['functions.sql','migrations/001_phase1_fields.sql','migrations/002_phase1_addons.sql','migrations/003_resize_embeddings.sql','migrations/004_session_ownership.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'))
 const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002',eve='00000000-0000-4000-8000-000000000003'
 const as=async id=>{await db.exec('SET ROLE authenticated');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id])}
 await as(alice)
 const event=(await db.query("INSERT INTO events(name,code,max_cards) VALUES('Test','ABC123',2) RETURNING id")).rows[0].id
 const card=async name=>(await db.query("INSERT INTO vibe_cards(event_id,name,emoji,project,need,offer) VALUES($1,$2,'*','Project','Need design help','Offer coding help') RETURNING id",[event,name])).rows[0].id
 const a=await card('Alice');await as(bob);const b=await card('Bob')
 assert.equal((await db.query("UPDATE vibe_cards SET name='Stolen' WHERE id=$1 RETURNING id",[a])).rows.length,0)
 await assert.rejects(db.query('UPDATE vibe_cards SET owner_id=$1 WHERE id=$2',[alice,b]))
 await as(eve);await assert.rejects(card('Eve'),/room_full/)
 await as(alice)
 const match=(await db.query("INSERT INTO matches(card_a,card_b,initiator_card,card_a_snapshot) VALUES($1,$2,$1,$3) RETURNING *",[a,b,JSON.stringify({name:'forged'})])).rows[0]
 assert.equal(match.card_a_snapshot.name,'Alice');assert.equal(match.card_a_snapshot.owner_id,undefined)
 assert.equal((await db.query("UPDATE matches SET status='accepted' WHERE id=$1 RETURNING id",[match.id])).rows.length,0)
 await as(eve);assert.equal((await db.query('SELECT * FROM matches')).rows.length,0)
 await assert.rejects(db.query('INSERT INTO matches(card_a,card_b,initiator_card) VALUES($1,$2,$1)',[a,b]))
 await as(bob)
 assert.equal((await db.query("UPDATE matches SET status='accepted' WHERE id=$1 RETURNING id",[match.id])).rows.length,1)
 await assert.rejects(db.query("UPDATE matches SET status='pending' WHERE id=$1",[match.id]),/invalid_match_transition/)
 await assert.rejects(db.query("UPDATE matches SET icebreaker='edited' WHERE id=$1",[match.id]),/invalid_match_transition/)
 await db.exec('RESET ROLE; SET ROLE anon;');await assert.rejects(db.query('SELECT * FROM vibe_cards'))
 }finally{await db.close()}
})
