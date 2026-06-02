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

const findUserByEmail = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string
) => {
  const normalizedEmail = email.toLowerCase()
  let page = 1
  const perPage = 1000

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const user = data.users.find((entry) => entry.email?.toLowerCase() === normalizedEmail)
    if (user) return user
    if (data.users.length < perPage) return null
    page += 1
  }

  return null
}

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
    const skipped: Array<{ name: string; reason: string }> = []

    for (const entry of players) {
      const displayName = entry?.name?.trim()
      if (!displayName) continue
      const base = slugify(displayName) || 'player'
      let username = base
      let email = `${username}@checkout.local`
      let attempt = 0
      let existingProfileId: string | null = null
      while (attempt < 12) {
        const suffix = attempt === 0 ? '' : `-${randomToken(4).toLowerCase()}`
        username = `${base}${suffix}`
        email = `${username}@checkout.local`
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id, display_name')
          .eq('username', username)
          .maybeSingle()
        if (!existing) {
          existingProfileId = null
          break
        }
        // Reuse a leftover profile from a prior generation only when the display name matches
        // exactly — that is the same person re-imported after being removed from a tournament.
        if (attempt === 0 && existing.display_name === displayName) {
          existingProfileId = existing.id as string
          break
        }
        attempt += 1
      }

      const code = generateCode()
      let playerId: string | null = existingProfileId

      if (!playerId) {
        const existingAuthUser = await findUserByEmail(supabaseAdmin, email)
        if (existingAuthUser) {
          playerId = existingAuthUser.id
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(playerId, {
            password: code,
            user_metadata: {
              username,
              display_name: displayName
            }
          })
          if (updateError) {
            skipped.push({ name: displayName, reason: `updateExistingUser failed: ${updateError.message}` })
            continue
          }
        }
      }

      if (!playerId) {
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
          const existingAuthUser = await findUserByEmail(supabaseAdmin, email)
          if (!existingAuthUser) {
            skipped.push({ name: displayName, reason: createError?.message ?? 'createUser failed' })
            continue
          }
          playerId = existingAuthUser.id
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(playerId, {
            password: code,
            user_metadata: {
              username,
              display_name: displayName
            }
          })
          if (updateError) {
            skipped.push({ name: displayName, reason: `updateExistingUser failed: ${updateError.message}` })
            continue
          }
        } else {
          playerId = createdUser.user.id
        }
      } else {
        // Existing user: rotate their password to the new login code so the printed code works.
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(playerId, {
          password: code
        })
        if (updateError) {
          skipped.push({ name: displayName, reason: `updatePassword failed: ${updateError.message}` })
          continue
        }
      }

      await supabaseAdmin.from('profiles').upsert({
        id: playerId,
        username,
        display_name: displayName,
        email
      })
      const { error: playerInsertError } = await supabaseAdmin
        .from('tournament_players')
        .upsert(
          {
            id: crypto.randomUUID(),
            tournament_id: tournamentId,
            player_id: playerId
          },
          { onConflict: 'tournament_id,player_id', ignoreDuplicates: true }
        )
      if (playerInsertError) {
        skipped.push({ name: displayName, reason: `tournament_players upsert failed: ${playerInsertError.message}` })
        continue
      }
      const { error: codeUpsertError } = await supabaseAdmin
        .from('tournament_login_codes')
        .upsert(
          {
            id: crypto.randomUUID(),
            tournament_id: tournamentId,
            player_id: playerId,
            code
          },
          { onConflict: 'tournament_id,player_id' }
        )
      if (codeUpsertError) {
        skipped.push({ name: displayName, reason: `login_code upsert failed: ${codeUpsertError.message}` })
        continue
      }

      logins.push({ playerId, name: displayName, username, code })
    }

    return new Response(JSON.stringify({ logins, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
