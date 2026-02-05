<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-20">
    <div class="bg-white border-b-2 border-border px-6 py-6 shadow-sm">
      <div class="flex items-center gap-4 mb-4">
        <button
          @click="router.push('/')"
          class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
        >
          <i class="pi pi-arrow-left text-xl" />
        </button>
        <div>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <i class="pi pi-trophy text-2xl text-primary" />
            </div>
            <div>
              <h1 class="text-3xl font-bold text-foreground">Turniere</h1>
              <p class="text-sm text-muted-foreground">Round Robin & Tabellen</p>
            </div>
          </div>
        </div>
      </div>

      <button
        @click="router.push('/tournaments/new')"
        class="w-full bg-primary text-primary-foreground rounded-xl py-4 px-4 flex items-center justify-center gap-2 active:scale-98 transition-all font-bold"
      >
        <i class="pi pi-plus" />
        Neues Turnier
      </button>
    </div>

    <div class="px-6 py-8">
      <div class="bg-white border-2 border-border rounded-2xl p-4 mb-6">
        <div class="text-sm font-semibold text-foreground mb-3">Filter</div>
        <div class="grid grid-cols-3 gap-2">
          <button
            @click="statusFilter = 'all'"
            class="px-3 py-2 rounded-xl font-semibold transition-all border-2 text-sm"
            :class="statusFilter === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'"
          >
            Alle
          </button>
          <button
            @click="statusFilter = 'active'"
            class="px-3 py-2 rounded-xl font-semibold transition-all border-2 text-sm"
            :class="statusFilter === 'active'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'"
          >
            Aktiv
          </button>
          <button
            @click="statusFilter = 'finished'"
            class="px-3 py-2 rounded-xl font-semibold transition-all border-2 text-sm"
            :class="statusFilter === 'finished'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'"
          >
            Beendet
          </button>
        </div>
      </div>
      <div class="bg-white border-2 border-border rounded-2xl p-6 mb-6">
        <h2 class="text-lg font-bold text-foreground mb-3">Online-Turnier beitreten</h2>
        <div class="flex gap-2">
          <input
            v-model="inviteCode"
            type="text"
            placeholder="Invite-Code"
            class="flex-1 px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
          />
          <button
            @click="joinOnlineTournament"
            class="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold"
          >
            Beitreten
          </button>
        </div>
        <p v-if="joinMessage" class="text-xs text-muted-foreground mt-2">{{ joinMessage }}</p>
      </div>

      <div class="mb-6">
        <h2 class="text-lg font-bold text-foreground mb-3">Online-Turniere</h2>
      <div v-if="filteredOnlineTournaments.length === 0" class="bg-white border-2 border-dashed border-border rounded-2xl py-10 px-6 text-center">
        <i class="pi pi-cloud text-3xl text-muted-foreground mx-auto mb-3 opacity-40" />
        <p class="text-sm text-muted-foreground">Noch keine Online-Turniere.</p>
      </div>
      <div v-else class="space-y-4">
        <button
          v-for="tournament in filteredOnlineTournaments"
          :key="tournament.id"
          @click="router.push(`/tournaments/online/${tournament.id}`)"
          class="w-full bg-white border-2 border-border rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-lg font-bold text-foreground">{{ tournament.name }}</div>
                <div class="text-xs text-muted-foreground font-semibold">
                  {{ modeLabel(tournament.mode) }} · {{ tournament.settings.doubleOut ? 'Double-Out' : 'Single-Out' }}
                </div>
              </div>
              <div class="text-xs font-semibold text-muted-foreground">{{ formatDate(tournament.date) }}</div>
            </div>
            <div class="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span class="px-2 py-1 rounded-full bg-primary/10 text-primary">online</span>
              <span class="px-2 py-1 rounded-full bg-muted text-muted-foreground">{{ tournament.status }}</span>
            </div>
          </button>
        </div>
      </div>

      <h2 class="text-lg font-bold text-foreground mb-3">Lokale Turniere</h2>
      <div v-if="filteredTournaments.length === 0" class="bg-white border-2 border-dashed border-border rounded-2xl py-16 px-6 text-center">
        <i class="pi pi-trophy text-4xl text-muted-foreground mx-auto mb-4 opacity-40" />
        <p class="text-lg font-semibold text-muted-foreground mb-1">Noch keine Turniere</p>
        <p class="text-sm text-muted-foreground">Erstelle dein erstes Turnier.</p>
      </div>

      <div v-else class="space-y-4">
        <button
          v-for="tournament in filteredTournaments"
          :key="tournament.id"
          @click="router.push(`/tournaments/${tournament.id}`)"
          class="w-full bg-white border-2 border-border rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="text-lg font-bold text-foreground">{{ tournament.name }}</div>
              <div class="text-xs text-muted-foreground font-semibold">
                {{ modeLabel(tournament.mode) }} · {{ tournament.settings.doubleOut ? 'Double-Out' : 'Single-Out' }}
              </div>
            </div>
            <div class="text-xs font-semibold text-muted-foreground">{{ formatDate(tournament.date) }}</div>
          </div>
          <div class="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span class="px-2 py-1 rounded-full bg-primary/10 text-primary">{{ tournament.status }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import { useTournamentsStore } from '@/stores/tournamentsStore'
import { useOnlineTournamentsStore } from '@/stores/onlineTournamentsStore'

const router = useRouter()
const tournamentsStore = useTournamentsStore()
const onlineTournamentsStore = useOnlineTournamentsStore()
const tournaments = computed(() => tournamentsStore.tournaments)
const onlineTournaments = computed(() => onlineTournamentsStore.tournaments)
const statusFilter = ref<'all' | 'active' | 'finished'>('all')
const inviteCode = ref('')
const joinMessage = ref('')

onMounted(() => {
  onlineTournamentsStore.fetchMyTournaments()
})

const modeLabel = (mode: string) => {
  if (mode === 'round_robin') return 'Round Robin'
  if (mode === 'knockout') return 'K.O.-Phase'
  return 'Kombi'
}

const formatDate = (value: string) => {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const joinOnlineTournament = async () => {
  joinMessage.value = ''
  if (!inviteCode.value.trim()) return
  const success = await onlineTournamentsStore.joinByInvite(inviteCode.value.trim())
  joinMessage.value = success ? 'Beitritt erfolgreich.' : 'Invite-Code ungültig.'
  inviteCode.value = ''
}

const normalizeStatus = (status?: string) => (status ?? 'active')

const filteredOnlineTournaments = computed(() => {
  if (statusFilter.value === 'all') return onlineTournaments.value
  return onlineTournaments.value.filter((tournament) => normalizeStatus(tournament.status) === statusFilter.value)
})

const filteredTournaments = computed(() => {
  if (statusFilter.value === 'all') return tournaments.value
  return tournaments.value.filter((tournament) => normalizeStatus(tournament.status) === statusFilter.value)
})
</script>
