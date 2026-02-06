import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { createId } from '@/domain/id'

export interface FriendProfile {
  id: string
  username: string
  displayName: string
}

interface FriendsState {
  friends: FriendProfile[]
  loading: boolean
  error: string | null
}

export const useFriendsStore = defineStore('friends', {
  state: (): FriendsState => ({
    friends: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchFriends() {
      const auth = useAuthStore()
      if (!auth.session?.user) {
        this.friends = []
        return
      }
      this.loading = true
      this.error = null
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', auth.session.user.id)
      if (error) {
        this.error = error.message
        this.loading = false
        return
      }
      const friendIds = (rows ?? []).map((row: any) => row.friend_id)
      if (friendIds.length === 0) {
        this.friends = []
        this.loading = false
        return
      }
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', friendIds)
      if (profileError) {
        this.error = profileError.message
        this.loading = false
        return
      }
      this.friends =
        (profiles ?? []).map((profile: any) => ({
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name
        })) ?? []
      this.loading = false
    },
    async addFriendByUsername(username: string) {
      const auth = useAuthStore()
      if (!auth.session?.user) throw new Error('Bitte zuerst einloggen')
      const cleaned = username.trim()
      if (!cleaned) throw new Error('Bitte einen Benutzernamen eingeben')
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .ilike('username', cleaned)
        .maybeSingle()
      if (error || !profile) {
        throw new Error('Benutzer nicht gefunden')
      }
      if (profile.id === auth.session.user.id) {
        throw new Error('Du kannst dich nicht selbst hinzufügen')
      }
      const { error: insertError } = await supabase.from('friendships').insert({
        id: createId(),
        user_id: auth.session.user.id,
        friend_id: profile.id
      })
      if (insertError) {
        if (insertError.message?.toLowerCase().includes('duplicate')) {
          throw new Error('Freund ist bereits hinzugefügt')
        }
        throw new Error(insertError.message)
      }
      await this.fetchFriends()
    },
    async removeFriend(friendId: string) {
      const auth = useAuthStore()
      if (!auth.session?.user) throw new Error('Bitte zuerst einloggen')
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', auth.session.user.id)
        .eq('friend_id', friendId)
      if (error) {
        throw new Error(error.message)
      }
      this.friends = this.friends.filter((friend) => friend.id !== friendId)
    }
  }
})
