// Sends due reminders as Web Push. Called every minute by pg_cron (see supabase/push-setup.md).
// reminders-core.js is generated from src/reminders-core.ts by `npm run functions:build`; do not edit it by hand.
// @ts-nocheck  (Deno runtime; the app's tsconfig does not cover this folder)
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { computeReminders, DEFAULT_PREFS, todayIn } from './reminders-core.js';

const env = (k: string) => Deno.env.get(k) ?? '';

// A user can register any endpoint string, so only ever POST to the real browser push services.
const PUSH_HOSTS = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];
const trustedEndpoint = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch { return false; }
};

Deno.serve(async (req) => {
  // Not JWT-protected (called by pg_cron), so a shared secret guards it.
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return new Response('forbidden', { status: 401 });

  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  webpush.setVapidDetails(env('VAPID_SUBJECT') || 'mailto:admin@example.com', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));

  const { data: subs, error } = await sb.from('push_subscriptions').select('*');
  if (error) return new Response(error.message, { status: 500 });
  if (!subs?.length) return Response.json({ sent: 0 });

  const now = new Date();
  const byUser = new Map<string, typeof subs>();
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  let sent = 0;
  for (const [userId, devices] of byUser) {
    const [p, tasks, plans, schedules, stages, guidance] = await Promise.all([
      sb.from('profiles').select('tz').eq('user_id', userId).maybeSingle(),
      sb.from('tasks').select('id,title,subject,date,done').eq('user_id', userId).eq('done', false),
      sb.from('plans').select('id,title,subject,date,time,class_name,kind').eq('user_id', userId),
      sb.from('schedules').select('*').eq('user_id', userId),
      sb.from('thesis_stages').select('id,title,status,date,note').eq('user_id', userId),
      sb.from('thesis_guidance').select('id,date,lecturer,notes,followup,followup_done').eq('user_id', userId),
    ]);
    const failed = [p, tasks, plans, schedules, stages, guidance].find((r) => r.error);
    if (failed) { console.error('load failed for a user (was migration 0004 run?)', failed.error.message); continue; }
    const db = {
      profile: { name: '', tz: p.data?.tz ?? 'Asia/Jakarta' },
      tasks: (tasks.data ?? []).map((r) => ({ ...r, date: r.date ?? '', done: false })),
      plans: (plans.data ?? []).map((r) => ({ ...r, date: r.date ?? '', className: r.class_name })),
      schedules: (schedules.data ?? []).map((r) => ({ id: r.id, subject: r.subject, className: r.class_name, day: r.day, start: r.start_time, end: r.end_time, room: r.room, until: r.until ?? '' })),
      stages: (stages.data ?? []).map((r) => ({ ...r, date: r.date ?? '' })),
      guidance: (guidance.data ?? []).map((r) => ({ ...r, date: r.date ?? '', followupDone: r.followup_done })),
    };
    const today = todayIn(db.profile.tz, now);

    for (const dev of devices) {
      if (!trustedEndpoint(dev.endpoint)) { await sb.from('push_subscriptions').delete().eq('id', dev.id); continue; }
      const prefs = { ...DEFAULT_PREFS, ...dev.prefs, enabled: true };
      const due = computeReminders(db, now, prefs);
      if (!due.length) continue;
      const { data: done } = await sb.from('push_sent').select('key').eq('subscription_id', dev.id).eq('sent_on', today);
      const seen = new Set((done ?? []).map((r) => r.key));
      for (const r of due) {
        if (seen.has(r.key)) continue;
        // Record first: if two runs overlap, the primary key lets only one of them send.
        const { error: dup } = await sb.from('push_sent').insert({ subscription_id: dev.id, key: r.key, sent_on: today });
        if (dup) continue;
        try {
          await webpush.sendNotification(
            { endpoint: dev.endpoint, keys: { p256dh: dev.p256dh, auth: dev.auth } },
            JSON.stringify({ title: r.title, body: r.body, tag: r.key, url: r.url }),
            { TTL: r.group === 'classes' ? 300 : 3600, urgency: 'high' }, // a stale "starts in 10 minutes" is worse than none
          );
          sent++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) { await sb.from('push_subscriptions').delete().eq('id', dev.id); break; } // device is gone
          console.error('push failed', e.statusCode ?? e.message);
          await sb.from('push_sent').delete().eq('subscription_id', dev.id).eq('key', r.key); // transient: try again next minute
        }
      }
    }
  }

  // Keep the log small: reminders only dedupe within a day.
  await sb.from('push_sent').delete().lt('sent_on', todayIn('UTC', new Date(now.getTime() - 3 * 86400000)));
  return Response.json({ sent });
});
