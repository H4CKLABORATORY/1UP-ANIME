/* Node-only smoke checks. No Supabase project, connection or database writes. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read=file=>fs.readFileSync(file,'utf8');
for(const file of ['supabase-config.js','supabase-episode-backend.js','episode-comments.js','sw.js']){
 new vm.Script(read(file),{filename:file});
}
const sql=read('supabase/sql/oneup_community_optional.sql');
for(const name of ['oneup_episode_comments','oneup_comment_reports','oneup_anime_progress']){
 assert(sql.includes('alter table public.'+name+' enable row level security;'),name+' lacks RLS');
 assert(sql.includes('create table if not exists public.'+name),name+' table missing');
}
assert(!/security\s+definer/i.test(sql),'Backend must not bypass row security');
assert(sql.includes('author_id = (select auth.uid())'),'Comments must be owner-linked');
assert(sql.includes('user_id = (select auth.uid())'),'Progress must be owner-linked');
assert(sql.includes('reporter_id = (select auth.uid())'),'Reports must be owner-linked');
assert(sql.includes("interval '45 seconds'"),'Anti-spam cooldown missing');
assert(sql.includes('grant select on public.oneup_episode_comments to anon, authenticated;'),'Public reads must be explicit');
assert(!/grant\s+(?:all|update|delete)\s+on\s+public\.oneup_episode_comments\s+to\s+authenticated/i.test(sql),
 'Comment moderation must not be delegated to browser sessions');
const config=read('supabase-config.js');
assert(config.includes('= null;'),'Supabase must be off until configured');
const html=read('index.html');
const backendPos=html.indexOf('src="./supabase-episode-backend.js"');
const configPos=html.indexOf('src="./supabase-config.js"');
const commentPos=html.indexOf('src="./episode-comments.js"');
assert(configPos>=0&&configPos<backendPos&&backendPos<commentPos,'Scripts must load in safe order');
const comments=read('episode-comments.js');
assert(comments.includes('OneUpSupabaseEpisodeBackend?.enabled()'),'Comments did not receive opt-in adapter');
assert(comments.includes('window.OneUpSocialBackend'),'Firebase fallback missing');
assert(read('sw.js').includes("'./supabase-episode-backend.js'"),'PWA missing backend file');
const w={ONEUP_SUPABASE_CONFIG:null};
vm.runInNewContext(read('supabase-episode-backend.js'),{window:w,URL,console});
const api=w.OneUpSupabaseEpisodeBackend;
assert.equal(api.enabled(),false,'Disabled config unexpectedly enabled');
assert.equal(api.episodeId('mal-59741',1).name,'mal-59741');
assert.equal(api.episodeId('al-123',99).number,99);
assert.throws(()=>api.episodeId('mal-0',1));
assert.throws(()=>api.episodeId('mal-123',0));
assert.throws(()=>api.episodeId('mal-123',10000));
w.ONEUP_SUPABASE_CONFIG={
 url:'https://project.supabase.co',publishableKey:'sb_publishable_testonly'
};
assert.equal(api.enabled(),true,'Valid publishable config not recognized');
w.ONEUP_SUPABASE_CONFIG={url:'http://localhost',publishableKey:'sb_secret_private'};
assert.equal(api.enabled(),false,'Unsafe credentials were accepted');
assert(api.maskError({code:'P0001'}).includes('rápido'),'Rate-limit message missing');
console.log('1UP optional Supabase checks passed: wiring, RLS guardrails and disabled-by-default config.');
