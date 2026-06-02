import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'
import webpush from 'https://esm.sh/web-push@3.6.7?bundle'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface SendPushBody {
  /** UUIDs of recipients (auth.users.id). Empty/missing => no-op. */
  userIds: string[]
  title?: string
  body?: string
  /** Path within the app to open on click, e.g. /tournaments/online/<id> */
  url?: string
  /** Optional notification tag, e.g. "match-<id>" so retries collapse. */
  tag?: string
  /** When set, only the tournament admin may call. Used to authorise the
   *  "previous-match-finished" auto-trigger that runs from the client. */
  tournamentId?: string
}

interface SubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  user_id: string
}

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@checkout.local'
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json(500, { error: 'Missing Supabase env vars' })
    }
    if (!vapidPublicKey || !vapidPrivateKey) {
      return json(500, { error: 'VAPID keys not configured' })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return json(401, { error: 'Unauthorized' })
    }

    const body = (await req.json()) as SendPushBody
    if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
      return json(400, { error: 'userIds is required' })
    }

    // If a tournamentId is set, the caller must be the tournament admin OR
    // a participant of the tournament. This stops random authenticated users
    // from spamming arbitrary push messages to other accounts.
    if (body.tournamentId) {
      const { data: tournament } = await supabaseAdmin
        .from('tournaments')
        .select('id, created_by')
        .eq('id', body.tournamentId)
        .maybeSingle()
      if (!tournament) {
        return json(404, { error: 'Tournament not found' })
      }
      const isAdmin = tournament.created_by === user.id
      let allowed = isAdmin
      if (!allowed) {
        const { data: membership } = await supabaseAdmin
          .from('tournament_players')
          .select('player_id')
          .eq('tournament_id', body.tournamentId)
          .eq('player_id', user.id)
          .maybeSingle()
        allowed = Boolean(membership)
      }
      if (!allowed) {
        return json(403, { error: 'Not allowed for this tournament' })
      }
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_id')
      .in('user_id', body.userIds)
    if (subError) {
      return json(500, { error: subError.message })
    }

    const subs = (subscriptions ?? []) as SubscriptionRow[]
    if (subs.length === 0) {
      return json(200, { sent: 0, failed: 0, skipped: body.userIds.length })
    }

    const payload = JSON.stringify({
      title: body.title ?? 'CheckOut',
      body: body.body ?? '',
      url: body.url ?? '/',
      tag: body.tag
    })

    const staleIds: string[] = []
    let sent = 0
    let failed = 0
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            payload
          )
          sent += 1
        } catch (err) {
          failed += 1
          const status = (err as { statusCode?: number }).statusCode
          // 404 = endpoint gone, 410 = subscription expired. Drop them so we
          // don't keep retrying.
          if (status === 404 || status === 410) {
            staleIds.push(sub.id)
          } else {
            console.warn('push send failed', sub.endpoint, status, err)
          }
        }
      })
    )

    if (staleIds.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('id', staleIds)
    }

    return json(200, { sent, failed, removed: staleIds.length })
  } catch (error) {
    return json(500, { error: (error as Error).message })
  }
})
