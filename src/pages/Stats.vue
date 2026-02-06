<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-20">
    <div class="bg-white border-b-2 border-border px-6 py-6 shadow-sm">
      <div class="flex items-center gap-4 mb-6">
        <button
          @click="router.push('/')"
          class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
        >
          <i class="pi pi-arrow-left text-xl" />
        </button>
        <div>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <i class="pi pi-chart-line text-2xl text-primary" />
            </div>
            <div>
              <h1 class="text-3xl font-bold text-foreground">Statistiken</h1>
              <p class="text-sm text-muted-foreground">Spieler-Auswertungen</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="px-6 py-8 space-y-6">
      <div v-if="!auth.isAuthenticated" class="bg-white border-2 border-dashed border-border rounded-2xl py-16 px-6 text-center">
        <i class="pi pi-user text-4xl text-muted-foreground mx-auto mb-4 opacity-40" />
        <p class="text-lg font-semibold text-muted-foreground mb-1">Bitte einloggen</p>
        <p class="text-sm text-muted-foreground">Melde dich an, um Freunde & Online-Statistiken zu sehen.</p>
      </div>

      <template v-else>
        <div class="bg-white border-2 border-border rounded-2xl p-6 space-y-4">
          <h2 class="text-lg font-bold text-foreground">Freunde</h2>
          <div class="flex flex-wrap gap-2">
            <input
              v-model="friendInput"
              type="text"
              placeholder="Benutzername"
              class="flex-1 min-w-[220px] px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
            />
            <button
              @click="addFriend"
              class="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold"
            >
              Hinzufügen
            </button>
          </div>
          <p v-if="friendError" class="text-xs text-destructive">{{ friendError }}</p>
          <div v-if="friends.length === 0" class="text-sm text-muted-foreground">Noch keine Freunde hinzugefügt.</div>
          <div v-else class="space-y-3">
            <div
              v-for="friend in friends"
              :key="friend.id"
              class="flex items-center justify-between bg-muted/30 border-2 border-border rounded-xl px-4 py-3"
            >
              <div>
                <div class="font-semibold text-foreground">{{ friend.displayName }}</div>
                <div class="text-xs text-muted-foreground">@{{ friend.username }}</div>
              </div>
              <button
                class="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-all"
                @click="removeFriend(friend.id)"
              >
                <i class="pi pi-trash text-sm" />
              </button>
            </div>
          </div>
        </div>

        <div class="bg-white border-2 border-border rounded-2xl p-6">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 class="text-lg font-bold text-foreground">Statistiken</h2>
            <button
              @click="loadStats"
              class="text-xs font-bold text-primary"
            >
              Aktualisieren
            </button>
          </div>
          <div v-if="loadingStats" class="text-sm text-muted-foreground">Lade Statistiken…</div>
          <div v-else-if="statsCards.length === 0" class="text-sm text-muted-foreground">
            Noch keine Online-Statistiken verfügbar.
          </div>
          <div v-else class="grid gap-4">
            <div
              v-for="entry in statsCards"
              :key="entry.stat.playerId"
              class="relative"
            >
              <span
                v-if="entry.isSelf"
                class="absolute -top-2 right-4 text-[11px] font-semibold bg-primary text-primary-foreground px-2 py-1 rounded-full shadow-sm"
              >
                Du
              </span>
              <MatchPlayerStatsCard :stat="entry.stat" />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useFriendsStore } from '@/stores/friendsStore'
import { useOnlineTournamentsStore } from '@/stores/onlineTournamentsStore'
import { supabase } from '@/services/supabase'
import MatchPlayerStatsCard from '@/components/MatchPlayerStatsCard.vue'
import type { MatchPlayerSummary } from '@/domain/matchSummary'

const router = useRouter()
const auth = useAuthStore()
const friendsStore = useFriendsStore()
const onlineStore = useOnlineTournamentsStore()

const friendInput = ref('')
const friendError = ref('')
const loadingStats = ref(false)
const onlineResults = ref<Array<{ stats: any[] }>>([])

const friends = computed(() => friendsStore.friends)

const loadStats = async () => {
  if (!auth.session?.user) return
  loadingStats.value = true
  await onlineStore.fetchMyTournaments()
  const tournamentIds = onlineStore.tournaments.map((t) => t.id)
  if (tournamentIds.length === 0) {
    onlineResults.value = []
    loadingStats.value = false
    return
  }
  const { data, error } = await supabase
    .from('tournament_match_results')
    .select('tournament_id, stats')
    .in('tournament_id', tournamentIds)
  if (error) {
    console.warn(error)
    onlineResults.value = []
  } else {
    onlineResults.value = data ?? []
  }
  loadingStats.value = false
}

const addFriend = async () => {
  friendError.value = ''
  const username = friendInput.value.trim()
  if (!username) return
  try {
    await friendsStore.addFriendByUsername(username)
    friendInput.value = ''
  } catch (err) {
    friendError.value = (err as Error).message ?? 'Freund konnte nicht hinzugefügt werden.'
  }
}

const removeFriend = async (friendId: string) => {
  friendError.value = ''
  try {
    await friendsStore.removeFriend(friendId)
  } catch (err) {
    friendError.value = (err as Error).message ?? 'Freund konnte nicht entfernt werden.'
  }
}

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const buildStatsMap = () => {
  const map = new Map<string, MatchPlayerSummary & { totalPoints: number; totalDarts: number }>()
  for (const result of onlineResults.value) {
    const stats = Array.isArray(result.stats) ? result.stats : []
    for (const raw of stats) {
      const playerId = raw.playerId ?? raw.player_id
      if (!playerId) continue
      const current = map.get(playerId) ?? {
        playerId,
        name: raw.name ?? raw.displayName ?? 'Spieler',
        isWinner: false,
        legsWon: 0,
        legsLost: 0,
        average: 0,
        checkoutRate: 0,
        checkoutAttempts: 0,
        checkoutHits: 0,
        doubleDarts: 0,
        count100Plus: 0,
        count140Plus: 0,
        count180: 0,
        totalDarts: 0,
        totalPoints: 0,
        highestCheckout: 0
      }
      current.totalPoints += numberValue(raw.totalPoints ?? raw.total_points)
      current.totalDarts += numberValue(raw.totalDarts ?? raw.total_darts)
      current.checkoutAttempts += numberValue(raw.checkoutAttempts ?? raw.checkout_attempts)
      current.checkoutHits += numberValue(raw.checkoutHits ?? raw.checkout_hits)
      current.doubleDarts += numberValue(raw.doubleDarts ?? raw.double_darts)
      current.count100Plus += numberValue(raw.count100Plus ?? raw.count_100_plus)
      current.count140Plus += numberValue(raw.count140Plus ?? raw.count_140_plus)
      current.count180 += numberValue(raw.count180 ?? raw.count_180)
      current.highestCheckout = Math.max(
        current.highestCheckout,
        numberValue(raw.highestCheckout ?? raw.highest_checkout)
      )
      map.set(playerId, current)
    }
  }

  for (const entry of map.values()) {
    entry.average = entry.totalDarts === 0 ? 0 : (entry.totalPoints / entry.totalDarts) * 3
    entry.checkoutRate =
      entry.checkoutAttempts === 0 ? 0 : (entry.checkoutHits / entry.checkoutAttempts) * 100
  }

  return map
}

const statsCards = computed(() => {
  if (!auth.session?.user) return []
  const map = buildStatsMap()
  const self = auth.profile
    ? { id: auth.profile.id, name: auth.profile.displayName || auth.profile.username }
    : { id: auth.session.user.id, name: 'Du' }
  const entries = [self, ...friends.value.map((friend) => ({ id: friend.id, name: friend.displayName }))].map(
    (player) => {
      const stat = map.get(player.id) ?? {
        playerId: player.id,
        name: player.name,
        isWinner: false,
        legsWon: 0,
        legsLost: 0,
        average: 0,
        checkoutRate: 0,
        checkoutAttempts: 0,
        checkoutHits: 0,
        doubleDarts: 0,
        count100Plus: 0,
        count140Plus: 0,
        count180: 0,
        totalDarts: 0,
        totalPoints: 0,
        highestCheckout: 0
      }
      return { stat: { ...stat, name: player.name }, isSelf: player.id === self.id }
    }
  )
  return entries
})

onMounted(async () => {
  if (!auth.isAuthenticated) return
  await friendsStore.fetchFriends()
  await loadStats()
})
</script>
