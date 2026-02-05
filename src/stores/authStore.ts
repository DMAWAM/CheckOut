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
      await supabase.auth.signOut()
      this.session = null
      this.profile = null
    }
  }
})
