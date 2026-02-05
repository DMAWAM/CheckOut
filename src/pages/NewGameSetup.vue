<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-20">
    <div class="bg-white border-b-2 border-border px-6 py-6 shadow-sm">
      <div class="flex items-center gap-4 mb-2">
        <button
          @click="router.push('/')"
          class="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
        >
          <i class="pi pi-arrow-left text-xl" />
        </button>
        <div>
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <i class="pi pi-bolt text-2xl text-primary" />
            </div>
            <div>
              <h1 class="text-3xl font-bold text-foreground">Neues Spiel</h1>
              <p class="text-sm text-muted-foreground">
                {{ startingScore }} • {{ doubleOut ? 'Double-Out' : 'Single-Out' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="px-6 py-8 space-y-6">
      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wide">
          <i class="pi pi-users" />
          Spieler 1
        </label>
        <div class="relative">
          <input
            v-model="player1Input"
            type="text"
            placeholder="Name eingeben oder auswählen"
            class="w-full bg-white border-2 border-border rounded-xl px-5 py-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            @focus="showPlayer1Suggestions = true"
            @input="onPlayer1Input"
          />

          <div
            v-if="showPlayer1Suggestions && filteredPlayer1Suggestions.length > 0"
            class="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-border rounded-xl shadow-xl max-h-60 overflow-y-auto z-10"
          >
            <button
              v-for="player in filteredPlayer1Suggestions"
              :key="player.id"
              @click="selectPlayer(1, player.name)"
              class="w-full text-left px-5 py-4 hover:bg-secondary transition-colors border-b-2 border-border last:border-b-0 font-semibold"
            >
              {{ player.name }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center">
        <div class="w-14 h-14 bg-muted border-2 border-border rounded-full flex items-center justify-center">
          <span class="text-xl font-black text-foreground">VS</span>
        </div>
      </div>

      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wide">
          <i class="pi pi-users" />
          Spieler 2
        </label>
        <div class="relative">
          <input
            v-model="player2Input"
            type="text"
            placeholder="Name eingeben oder auswählen"
            class="w-full bg-white border-2 border-border rounded-xl px-5 py-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            @focus="showPlayer2Suggestions = true"
            @input="onPlayer2Input"
          />

          <div
            v-if="showPlayer2Suggestions && filteredPlayer2Suggestions.length > 0"
            class="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-border rounded-xl shadow-xl max-h-60 overflow-y-auto z-10"
          >
            <button
              v-for="player in filteredPlayer2Suggestions"
              :key="player.id"
              @click="selectPlayer(2, player.name)"
              class="w-full text-left px-5 py-4 hover:bg-secondary transition-colors border-b-2 border-border last:border-b-0 font-semibold"
            >
              {{ player.name }}
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white border-2 border-border rounded-2xl p-6 space-y-5 shadow-sm">
        <div class="flex items-center justify-between pb-4 border-b-2 border-border">
          <div>
            <div class="font-bold text-lg text-foreground">Startpunkte</div>
            <div class="text-sm text-muted-foreground font-semibold">Wähle 301 / 501 / 701</div>
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
      </div>

      <div class="bg-white border-2 border-border rounded-2xl p-6 space-y-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold text-lg text-foreground">Match-Format</div>
            <div class="text-sm text-muted-foreground font-semibold">First-to oder Best-of</div>
          </div>
        </div>

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

      <div class="bg-white border-2 border-border rounded-2xl p-6 space-y-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold text-lg text-foreground">Spieler verwalten</div>
            <div class="text-sm text-muted-foreground font-semibold">Vorhandene Spieler löschen</div>
          </div>
        </div>

        <div v-if="playersStore.players.length === 0" class="text-sm text-muted-foreground">
          Noch keine Spieler vorhanden.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="player in playersStore.players"
            :key="player.id"
            class="flex items-center justify-between bg-muted rounded-xl px-4 py-3"
          >
            <span class="font-semibold text-foreground">{{ player.name }}</span>
            <button
              class="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"
              @click="deletePlayer(player.id)"
            >
              <i class="pi pi-trash" />
            </button>
          </div>
        </div>
      </div>

      <button
        @click="startMatch"
        :disabled="!player1Input.trim() || !player2Input.trim()"
        class="w-full bg-primary text-primary-foreground rounded-lg py-5 px-6 flex items-center justify-center gap-3 shadow-lg active:scale-98 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i class="pi pi-play" />
        <span class="text-xl font-semibold">Spiel starten</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { usePlayersStore } from '@/stores/playersStore'
import { createId } from '@/domain/id'
import type { MatchFormat } from '@/domain/models'

const router = useRouter()
const game = useGameStore()
const playersStore = usePlayersStore()

const player1Input = ref('')
const player2Input = ref('')
const doubleOut = ref(true)
const startingScore = ref<301 | 501 | 701>(501)

const formatMode = ref<'first_to' | 'best_of'>('first_to')
const targetCount = ref(3)
const bestOfCount = ref(5)
const useSets = ref(false)
const legsPerSet = ref(3)

const showPlayer1Suggestions = ref(false)
const showPlayer2Suggestions = ref(false)

const unitLabel = computed(() => (useSets.value ? 'Sätze' : 'Legs'))

const filteredPlayer1Suggestions = computed(() =>
  playersStore.players.filter((player) =>
    player.name.toLowerCase().includes(player1Input.value.toLowerCase()) &&
    player.name.toLowerCase() !== player2Input.value.toLowerCase()
  )
)

const filteredPlayer2Suggestions = computed(() =>
  playersStore.players.filter((player) =>
    player.name.toLowerCase().includes(player2Input.value.toLowerCase()) &&
    player.name.toLowerCase() !== player1Input.value.toLowerCase()
  )
)

const onPlayer1Input = () => {
  showPlayer1Suggestions.value = true
}

const onPlayer2Input = () => {
  showPlayer2Suggestions.value = true
}

const selectPlayer = (slot: 1 | 2, name: string) => {
  if (slot === 1) {
    player1Input.value = name
    showPlayer1Suggestions.value = false
  } else {
    player2Input.value = name
    showPlayer2Suggestions.value = false
  }
}

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

const deletePlayer = (playerId: string) => {
  const removed = playersStore.players.find((player) => player.id === playerId)
  playersStore.removePlayer(playerId)
  if (removed) {
    if (player1Input.value.toLowerCase() === removed.name.toLowerCase()) {
      player1Input.value = ''
    }
    if (player2Input.value.toLowerCase() === removed.name.toLowerCase()) {
      player2Input.value = ''
    }
  }
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

const startMatch = () => {
  const nameA = player1Input.value.trim()
  const nameB = player2Input.value.trim()
  if (!nameA || !nameB) return

  const ensurePlayer = (name: string) => {
    const existing = playersStore.players.find((player) => player.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing
    const newPlayer = { id: createId(), name, createdAt: new Date().toISOString() }
    playersStore.addPlayer(newPlayer)
    return newPlayer
  }

  ensurePlayer(nameA)
  ensurePlayer(nameB)

  game.startNewMatch(nameA, nameB, {
    doubleOut: doubleOut.value,
    format: buildFormat(),
    startingScore: startingScore.value
  })
  router.push('/game')
}
</script>
