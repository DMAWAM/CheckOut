<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-24">
    <div class="bg-white border-b-2 border-border px-6 py-6 shadow-sm">
      <div class="flex items-center gap-4">
        <button
          @click="router.push('/tournaments')"
          class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
        >
          <i class="pi pi-arrow-left text-xl" />
        </button>
        <div>
          <h1 class="text-3xl font-bold text-foreground">Neues Turnier</h1>
          <p class="text-sm text-muted-foreground">Round Robin, K.O. oder Kombi-Modus</p>
        </div>
      </div>
    </div>

    <div class="px-6 py-6 space-y-6">
      <div class="bg-white border-2 border-border rounded-2xl p-6">
        <h2 class="text-lg font-bold text-foreground mb-4">Turnierart</h2>
        <div class="grid grid-cols-2 gap-3">
          <button
            @click="tournamentScope = 'local'"
            class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
            :class="tournamentScope === 'local'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'"
          >
            Lokal
          </button>
          <button
            @click="tournamentScope = 'online'"
            class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
            :class="tournamentScope === 'online'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'"
          >
            Online
          </button>
        </div>
        <p class="text-xs text-muted-foreground mt-2">
          <span v-if="tournamentScope === 'local'">Alle Spieler werden lokal hinzugefügt.</span>
          <span v-else>Online: Spieler treten per Invite-Code bei (Supabase erforderlich).</span>
        </p>
      </div>
      <div class="bg-white border-2 border-border rounded-2xl p-6">
        <h2 class="text-lg font-bold text-foreground mb-4">Turnier-Details</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-foreground mb-2">Turniername *</label>
            <input
              v-model="tournamentName"
              type="text"
              placeholder="z.B. Winter Liga 2025"
              class="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-foreground mb-2">Datum / Zeitraum</label>
            <input
              v-model="tournamentDate"
              type="date"
              class="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-foreground mb-2">Turniermodus</label>
            <div class="grid grid-cols-3 gap-3">
              <button
                @click="tournamentType = 'round_robin'"
                class="px-3 py-3 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="tournamentType === 'round_robin'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                Round Robin
              </button>
              <button
                @click="tournamentType = 'knockout'"
                class="px-3 py-3 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="tournamentType === 'knockout'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                K.O.-Phase
              </button>
              <button
                @click="tournamentType = 'combined'"
                class="px-3 py-3 rounded-xl font-semibold transition-all border-2 text-sm"
                :class="tournamentType === 'combined'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'"
              >
                Kombi
              </button>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              <span v-if="tournamentType === 'round_robin'">Jeder spielt gegen jeden.</span>
              <span v-else-if="tournamentType === 'knockout'">Direkte K.O.-Runde mit Setzliste.</span>
              <span v-else>Erst Round Robin, danach K.O. nach Rangliste.</span>
            </p>
          </div>

          <div v-if="tournamentType !== 'knockout'" class="pt-2">
            <label class="block text-sm font-semibold text-foreground mb-2">Gruppenphase</label>
            <div class="flex items-center justify-between bg-muted/30 border-2 border-border rounded-xl px-4 py-3">
              <div>
                <div class="font-semibold text-foreground">Anzahl Gruppen</div>
                <div class="text-xs text-muted-foreground">
                  <span v-if="groupCount === 1">Alle spielen in einer Gruppe.</span>
                  <span v-else-if="tournamentType === 'combined'">Top 2 je Gruppe qualifizieren sich für die K.O.-Phase.</span>
                  <span v-else>Mehrere Gruppen spielen Round Robin.</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  @click="decrementGroups"
                >
                  -
                </button>
                <div class="w-12 text-center text-2xl font-black text-foreground">{{ groupCount }}</div>
                <button
                  class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                  :disabled="groupCount >= maxGroups"
                  @click="incrementGroups"
                >
                  +
                </button>
              </div>
            </div>
            <p v-if="maxGroups === 1" class="text-xs text-muted-foreground mt-2">
              Mindestens 4 Spieler nötig, um 2 Gruppen zu bilden.
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white border-2 border-border rounded-2xl p-6 space-y-5 shadow-sm">
        <div class="flex items-center justify-between pb-4 border-b-2 border-border">
          <div>
            <div class="font-bold text-lg text-foreground">Spielmodus</div>
            <div class="text-sm text-muted-foreground font-semibold">Gleiche Settings wie im Einzelspiel</div>
          </div>
          <div class="text-4xl font-black text-primary">{{ startingScore }}</div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="score in [301, 501, 701]"
            :key="score"
            @click="startingScore = score"
            class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
            :class="startingScore === score
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'"
          >
            {{ score }}
          </button>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold text-lg text-foreground">Double Out</div>
            <div class="text-sm text-muted-foreground font-semibold">Finish mit Doppel</div>
          </div>
          <button
            @click="doubleOut = !doubleOut"
            class="w-14 h-8 rounded-full transition-colors relative"
            :class="doubleOut ? 'bg-primary' : 'bg-secondary'"
          >
            <div
              class="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform"
              :class="doubleOut ? 'translate-x-7' : 'translate-x-1'"
            />
          </button>
        </div>

        <div class="space-y-3">
          <div class="font-bold text-lg text-foreground">Match-Format</div>

          <div class="grid grid-cols-2 gap-3">
            <button
              @click="formatMode = 'first_to'"
              class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
              :class="formatMode === 'first_to'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-secondary-foreground border-border'"
            >
              First-to
            </button>
            <button
              @click="formatMode = 'best_of'"
              class="px-4 py-3 rounded-xl font-semibold transition-all border-2"
              :class="formatMode === 'best_of'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-secondary-foreground border-border'"
            >
              Best-of
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <div class="font-bold text-lg text-foreground">
                {{ formatMode === 'first_to' ? 'First-to' : 'Best-of' }} {{ unitLabel }}
              </div>
              <div class="text-sm text-muted-foreground font-semibold">
                {{ formatMode === 'first_to' ? 'Ziel' : 'Gesamtanzahl' }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                @click="decrementFormat"
              >
                -
              </button>
              <div class="w-14 text-center text-2xl font-black text-foreground">
                {{ formatMode === 'first_to' ? targetCount : bestOfCount }}
              </div>
              <button
                class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                @click="incrementFormat"
              >
                +
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <div>
              <div class="font-bold text-lg text-foreground">Sätze spielen</div>
              <div class="text-sm text-muted-foreground font-semibold">Legs in Sets gruppieren</div>
            </div>
            <button
              @click="useSets = !useSets"
              class="w-14 h-8 rounded-full transition-colors relative"
              :class="useSets ? 'bg-primary' : 'bg-secondary'"
            >
              <div
                class="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform"
                :class="useSets ? 'translate-x-7' : 'translate-x-1'"
              />
            </button>
          </div>

          <div v-if="useSets" class="flex items-center justify-between">
            <div>
              <div class="font-bold text-lg text-foreground">Legs pro Satz</div>
              <div class="text-sm text-muted-foreground font-semibold">Legs pro Set</div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                @click="decrementLegsPerSet"
              >
                -
              </button>
              <div class="w-14 text-center text-2xl font-black text-foreground">{{ legsPerSet }}</div>
              <button
                class="w-9 h-9 rounded-xl border-2 border-border bg-white font-bold"
                @click="incrementLegsPerSet"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border-2 border-border rounded-2xl p-6" v-if="tournamentScope === 'local'">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-foreground">Spieler auswählen</h2>
            <p class="text-sm text-muted-foreground">Mindestens 2 Spieler erforderlich</p>
          </div>
          <div class="text-xs font-semibold text-muted-foreground">Ausgewählt: {{ selectedPlayerIds.length }}</div>
        </div>

        <div class="space-y-3">
          <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Neuen Spieler hinzufügen</label>
          <div class="flex gap-2">
            <input
              v-model="newPlayerName"
              type="text"
              placeholder="Name eingeben"
              class="flex-1 px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:outline-none bg-background text-foreground"
            />
            <button
              @click="addPlayer"
              class="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center"
            >
              <i class="pi pi-user-plus" />
            </button>
          </div>
        </div>

        <div v-if="playersStore.players.length === 0" class="mt-6 bg-muted/40 border-2 border-dashed border-border rounded-xl py-10 text-center">
          <i class="pi pi-users text-3xl text-muted-foreground mb-3" />
          <p class="text-sm text-muted-foreground">Keine Spieler verfügbar. Füge neue Spieler hinzu!</p>
        </div>

        <div v-else class="mt-6 space-y-3">
          <button
            v-for="player in playersStore.players"
            :key="player.id"
            @click="togglePlayer(player.id)"
            class="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
            :class="selectedPlayerIds.includes(player.id)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-white text-foreground'"
          >
            <span class="font-semibold">{{ player.name }}</span>
            <span
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center"
              :class="selectedPlayerIds.includes(player.id)
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white text-transparent'"
            >
              ✓
            </span>
          </button>
        </div>
      </div>

      <div v-else class="bg-white border-2 border-border rounded-2xl p-6">
        <h2 class="text-lg font-bold text-foreground mb-2">Online-Spieler</h2>
        <p class="text-sm text-muted-foreground">
          Nach dem Erstellen erhältst du einen Invite-Code, den du an andere Spieler verschickst.
        </p>
      </div>
    </div>

    <div class="px-6">
      <button
        :disabled="!canCreate"
        @click="createTournament"
        class="w-full rounded-2xl py-5 px-6 flex items-center justify-center gap-3 shadow-lg transition-all"
        :class="canCreate
          ? 'bg-primary text-primary-foreground active:scale-98'
          : 'bg-primary/60 text-primary-foreground/70 cursor-not-allowed'"
      >
        <i class="pi pi-check" />
        Turnier erstellen
      </button>
      <p v-if="errorMessage" class="text-center text-xs text-destructive mt-2">
        {{ errorMessage }}
      </p>
      <p class="text-center text-xs text-muted-foreground mt-2">
        {{ canCreate ? 'Alles bereit. Turnier starten.' : 'Bitte Turniername eingeben' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayersStore } from '@/stores/playersStore'
import { useTournamentsStore } from '@/stores/tournamentsStore'
import { useOnlineTournamentsStore } from '@/stores/onlineTournamentsStore'
import { createId } from '@/domain/id'
import type { MatchFormat, TournamentMode } from '@/domain/models'

const router = useRouter()
const playersStore = usePlayersStore()
const tournamentsStore = useTournamentsStore()
const onlineTournamentsStore = useOnlineTournamentsStore()

const tournamentName = ref('')
const tournamentDate = ref(new Date().toISOString().slice(0, 10))
const tournamentType = ref<TournamentMode>('round_robin')
const tournamentScope = ref<'local' | 'online'>('local')
const newPlayerName = ref('')
const selectedPlayerIds = ref<string[]>([])
const groupCount = ref(1)
const errorMessage = ref('')

const doubleOut = ref(true)
const startingScore = ref<301 | 501 | 701>(501)
const formatMode = ref<'first_to' | 'best_of'>('first_to')
const targetCount = ref(3)
const bestOfCount = ref(5)
const useSets = ref(false)
const legsPerSet = ref(3)

const unitLabel = computed(() => (useSets.value ? 'Sätze' : 'Legs'))

const maxGroups = computed(() => {
  if (tournamentScope.value === 'online') return 8
  return Math.max(1, Math.floor(selectedPlayerIds.value.length / 2))
})

const canCreate = computed(() => {
  if (!tournamentName.value.trim()) return false
  if (tournamentScope.value === 'local') return selectedPlayerIds.value.length >= 2
  return true
})

const addPlayer = () => {
  const name = newPlayerName.value.trim()
  if (!name) return
  const existing = playersStore.players.find((player) => player.name.toLowerCase() === name.toLowerCase())
  if (existing) {
    if (!selectedPlayerIds.value.includes(existing.id)) {
      selectedPlayerIds.value.push(existing.id)
    }
    newPlayerName.value = ''
    return
  }
  const player = { id: createId(), name, createdAt: new Date().toISOString() }
  playersStore.addPlayer(player)
  selectedPlayerIds.value.push(player.id)
  newPlayerName.value = ''
}

const togglePlayer = (playerId: string) => {
  if (selectedPlayerIds.value.includes(playerId)) {
    selectedPlayerIds.value = selectedPlayerIds.value.filter((id) => id !== playerId)
  } else {
    selectedPlayerIds.value.push(playerId)
  }
}

const decrementGroups = () => {
  groupCount.value = Math.max(1, groupCount.value - 1)
}

const incrementGroups = () => {
  groupCount.value = Math.min(maxGroups.value, groupCount.value + 1)
}

watch(
  () => tournamentType.value,
  () => {
    if (tournamentType.value === 'knockout') {
      groupCount.value = 1
    }
  }
)

watch(
  () => selectedPlayerIds.value.length,
  () => {
    if (tournamentScope.value === 'local' && groupCount.value > maxGroups.value) {
      groupCount.value = maxGroups.value
    }
  }
)

const decrementFormat = () => {
  if (formatMode.value === 'first_to') {
    targetCount.value = Math.max(1, targetCount.value - 1)
  } else {
    bestOfCount.value = Math.max(3, bestOfCount.value - 2)
  }
}

const incrementFormat = () => {
  if (formatMode.value === 'first_to') {
    targetCount.value = Math.min(9, targetCount.value + 1)
  } else {
    bestOfCount.value = Math.min(15, bestOfCount.value + 2)
  }
}

const decrementLegsPerSet = () => {
  legsPerSet.value = Math.max(1, legsPerSet.value - 1)
}

const incrementLegsPerSet = () => {
  legsPerSet.value = Math.min(9, legsPerSet.value + 1)
}

const buildFormat = (): MatchFormat => {
  const target = formatMode.value === 'first_to'
    ? targetCount.value
    : Math.ceil(bestOfCount.value / 2)

  return {
    type: formatMode.value,
    legsToWin: useSets.value ? legsPerSet.value : target,
    bestOf: formatMode.value === 'best_of' ? bestOfCount.value : undefined,
    useSets: useSets.value,
    setsToWin: useSets.value ? target : undefined,
    legsPerSet: useSets.value ? legsPerSet.value : undefined
  }
}

const createTournament = async () => {
  if (!canCreate.value) return
  errorMessage.value = ''
  if (tournamentScope.value === 'online') {
    try {
      const id = await onlineTournamentsStore.createTournament({
        name: tournamentName.value.trim(),
        date: tournamentDate.value,
        mode: tournamentType.value,
        settings: {
          mode501: startingScore.value === 501,
          doubleOut: doubleOut.value,
          format: buildFormat(),
          groupCount: tournamentType.value === 'knockout' ? 1 : groupCount.value,
          startingScore: startingScore.value
        }
      })
      router.push(`/tournaments/online/${id}`)
    } catch (err) {
      errorMessage.value = (err as Error).message ?? 'Online-Turnier konnte nicht erstellt werden.'
    }
    return
  }

  const id = tournamentsStore.createTournament({
    name: tournamentName.value.trim(),
    date: tournamentDate.value,
    mode: tournamentType.value,
    settings: {
      mode501: startingScore.value === 501,
      doubleOut: doubleOut.value,
      format: buildFormat(),
      groupCount: tournamentType.value === 'knockout' ? 1 : groupCount.value,
      startingScore: startingScore.value
    },
    playerIds: selectedPlayerIds.value
  })
  router.push(`/tournaments/${id}`)
}
</script>
