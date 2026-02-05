import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

type PlayerInput = { name: string }

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 20)

const randomToken = (length: number, alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

const generateCode = () => randomToken(8)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const {
      data: { user },
      error: userError
    } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const tournamentId = body?.tournamentId as string | undefined
    const players = (body?.players ?? []) as PlayerInput[]
    if (!tournamentId || !Array.isArray(players) || players.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from('tournaments')
      .select('id, created_by')
      .eq('id', tournamentId)
      .maybeSingle()
    if (tournamentError || !tournament) {
      return new Response(JSON.stringify({ error: 'Tournament not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (tournament.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const logins: Array<{ playerId: string; name: string; username: string; code: string }> = []

    for (const entry of players) {
      const displayName = entry?.name?.trim()
      if (!displayName) continue
      const base = slugify(displayName) || 'player'
      let username = base
      let email = `${username}@checkout.local`
      let attempt = 0
      while (attempt < 8) {
        const suffix = attempt === 0 ? '' : `-${randomToken(4).toLowerCase()}`
        username = `${base}${suffix}`
        email = `${username}@checkout.local`
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle()
        if (!existing) break
        attempt += 1
      }

      const code = generateCode()
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: code,
        email_confirm: true,
        user_metadata: {
          username,
          display_name: displayName
        }
      })
      if (createError || !createdUser?.user) {
        continue
      }

      const playerId = createdUser.user.id
      await supabaseAdmin.from('profiles').upsert({
        id: playerId,
        username,
        display_name: displayName,
        email
      })
      await supabaseAdmin.from('tournament_players').insert({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        player_id: playerId
      })
      await supabaseAdmin.from('tournament_login_codes').upsert({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        player_id: playerId,
        code
      })

      logins.push({ playerId, name: displayName, username, code })
    }

    return new Response(JSON.stringify({ logins }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
