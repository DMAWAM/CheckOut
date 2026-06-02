import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'

export interface AuthProfile {
  id: string
  username: string
  displayName: string
  email?: string
}

interface AuthState {
  session: Session | null
  profile: AuthProfile | null
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    session: null,
    profile: null,
    loading: false
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.session)
  },
  actions: {
    async init() {
      this.loading = true
      const { data } = await supabase.auth.getSession()
      this.session = data.session
      await this.fetchProfile()
      this.loading = false

      supabase.auth.onAuthStateChange(async (_event, session) => {
        this.session = session
        await this.fetchProfile()
      })
    },
    async fetchProfile() {
      if (!this.session?.user) {
        this.profile = null
        return
      }
      const user = this.session.user
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, email')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.warn('Profile load failed', error)
        this.profile = {
          id: user.id,
          username: user.user_metadata?.username ?? user.email ?? 'user',
          displayName: user.user_metadata?.display_name ?? user.email ?? 'User',
          email: user.email ?? undefined
        }
        return
      }

      if (data) {
        this.profile = {
          id: data.id,
          username: data.username,
          displayName: data.display_name,
          email: data.email ?? user.email ?? undefined
        }
      } else {
        const fallbackUsername = user.user_metadata?.username ?? user.email?.split('@')[0] ?? 'user'
        const fallbackDisplay = user.user_metadata?.display_name ?? user.email ?? 'User'
        const fallbackProfile = {
          id: user.id,
          username: fallbackUsername,
          displayName: fallbackDisplay,
          email: user.email ?? undefined
        }
        this.profile = fallbackProfile
        await supabase.from('profiles').upsert({
          id: user.id,
          username: fallbackUsername,
          display_name: fallbackDisplay,
          email: user.email ?? null
        })
      }
    },
    async login(identifier: string, password: string) {
      this.loading = true
      const trimmed = identifier.trim()
      let email = trimmed
      if (!trimmed.includes('@')) {
        const { data, error } = await supabase.rpc('get_email_for_username', { username_input: trimmed })
        if (error || !data) {
          this.loading = false
          throw new Error('Benutzername nicht gefunden')
        }
        email = data as string
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      this.loading = false
      if (error) throw error
    },
    async register(params: { email: string; password: string; username: string; displayName: string }) {
      this.loading = true
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            username: params.username,
            display_name: params.displayName
          }
        }
      })
      if (error) {
        this.loading = false
        throw error
      }

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: params.username,
          display_name: params.displayName,
          email: params.email
        })
      }
      this.loading = false
    },
    async requestPasswordReset(identifier: string) {
      this.loading = true
      const trimmed = identifier.trim()
      if (!trimmed) {
        this.loading = false
        throw new Error('Bitte E-Mail oder Benutzername eingeben')
      }
      let email = trimmed
      if (!trimmed.includes('@')) {
        const { data, error } = await supabase.rpc('get_email_for_username', { username_input: trimmed })
        if (error || !data) {
          this.loading = false
          throw new Error('Benutzername nicht gefunden')
        }
        email = data as string
      }
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}reset`
        : undefined
      const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined)
      this.loading = false
      if (error) throw error
    },
    async logout() {
      // Reset local auth state FIRST so the UI swaps to the login screen
      // immediately if anything below stalls.
      this.session = null
      this.profile = null
      this.loading = false

      // Fire signOut but cap it with a 2s timeout. Without this, an in-flight
      // refresh / dead network keeps the supabase-js client in a half-logged-
      // out state and the NEXT signInWithPassword call hangs forever showing
      // "Lädt". scope:'global' invalidates the refresh token on the server
      // too which is what we actually want.
      try {
        await Promise.race([
          supabase.auth.signOut({ scope: 'global' }),
          new Promise<{ error: Error | null }>((resolve) =>
            setTimeout(() => resolve({ error: new Error('signOut timeout') }), 2000)
          )
        ])
      } catch (err) {
        console.warn('logout signOut failed (continuing)', err)
      }

      // Belt-and-braces: nuke every supabase-managed localStorage key so a
      // subsequent page reload can NOT restore the previous session, and
      // any leftover refresh token can NOT re-hydrate the client into a
      // stale state mid-login.
      if (typeof window !== 'undefined') {
        try {
          Object.keys(window.localStorage)
            .filter((key) => key.startsWith('sb-') || key.startsWith('supabase'))
            .forEach((key) => window.localStorage.removeItem(key))
        } catch (err) {
          console.warn('logout localStorage cleanup failed', err)
        }

        // Hard navigate to root. This destroys the current JS context, so
        // the next page load builds a fresh supabase-js client that reads
        // a clean localStorage and starts in the truly logged-out state.
        // Without this, the in-memory client's auto-refresh / state still
        // points at the old session and the next sign-in attempt deadlocks.
        const base = import.meta.env.BASE_URL ?? '/'
        window.location.replace(base)
      }
    }
  }
})
