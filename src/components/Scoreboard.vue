<template>
  <div class="grid grid-cols-2 gap-2 sm:gap-4 p-3 sm:p-4">
    <div
      v-for="player in players"
      :key="player.id"
      class="bg-white rounded-2xl p-3 sm:p-4 transition-all relative min-w-0"
      :class="player.id === activePlayerId
        ? 'border-4 border-primary shadow-2xl shadow-primary/30 sm:scale-105'
        : 'border-2 border-border'"
    >
      <div class="absolute top-3 right-3 bg-muted px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold text-foreground">
        {{ scores[player.id] ?? 0 }}
      </div>
      <div class="text-[11px] sm:text-xs font-bold text-muted-foreground mb-2 truncate uppercase tracking-wide pr-12">
        {{ player.name }}
      </div>
      <div
        class="text-5xl sm:text-7xl font-black mb-2 leading-none tabular-nums"
        :class="player.id === activePlayerId ? 'text-primary' : 'text-dart-navy'"
      >
        {{ scores[player.id] ?? 0 }}
      </div>
      <div class="flex gap-2 text-xs mb-2">
        <div class="bg-muted px-2 py-1 rounded-md flex-1 text-center">
          <div class="text-[10px] text-muted-foreground">Ø</div>
          <div class="font-black text-foreground">{{ formatAverage(player.id) }}</div>
        </div>
        <div class="bg-dart-gold/15 px-2 py-1 rounded-md flex-1 text-center">
          <div class="text-[10px] text-muted-foreground">CO</div>
          <div class="font-black text-dart-gold">{{ formatCheckout(player.id) }}</div>
        </div>
      </div>
      <div
        v-if="checkoutByPlayer?.[player.id]"
        class="bg-accent/10 border-2 border-accent rounded-lg px-2 py-1.5"
      >
        <div class="text-[11px] font-black text-accent truncate text-center">
          {{ checkoutByPlayer[player.id]?.join(' ') }}
        </div>
      </div>

      <div class="mt-3 space-y-2">
        <template v-if="usesSets">
          <div class="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Sets</span>
            <span>{{ setWins[player.id] ?? 0 }}/{{ targetSets }}</span>
          </div>
          <div class="flex gap-1">
            <span
              v-for="n in targetSets"
              :key="`set-${player.id}-${n}`"
              class="h-1.5 flex-1 rounded-full"
              :class="n <= (setWins[player.id] ?? 0) ? 'bg-primary' : 'bg-border'"
            />
          </div>

          <div class="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Legs</span>
            <span>{{ setLegWins[player.id] ?? 0 }}/{{ targetLegsPerSet }}</span>
          </div>
          <div class="flex gap-1">
            <span
              v-for="n in targetLegsPerSet"
              :key="`leg-${player.id}-${n}`"
              class="h-1.5 flex-1 rounded-full"
              :class="n <= (setLegWins[player.id] ?? 0) ? 'bg-dart-gold' : 'bg-border'"
            />
          </div>
        </template>
        <template v-else>
          <div class="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Legs</span>
            <span>{{ legWins[player.id] ?? 0 }}/{{ targetLegsOnly }}</span>
          </div>
          <div class="flex gap-1">
            <span
              v-for="n in targetLegsOnly"
              :key="`leg-only-${player.id}-${n}`"
              class="h-1.5 flex-1 rounded-full"
              :class="n <= (legWins[player.id] ?? 0) ? 'bg-primary' : 'bg-border'"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MatchFormat, Player } from '@/domain/models'

interface PlayerStats {
  average: number
  checkoutRate: number
  // Optional: when the caller knows attempts is 0 (e.g. single-out
  // match), the scoreboard renders "—" instead of a misleading "0%".
  checkoutAttempts?: number
}

const props = defineProps<{
  players: Player[]
  scores: Record<string, number>
  activePlayerId: string | null
  statsByPlayer?: Record<string, PlayerStats>
  checkoutByPlayer?: Record<string, string[] | null>
  matchFormat?: MatchFormat | null
  legWins?: Record<string, number>
  setWins?: Record<string, number>
  setLegWins?: Record<string, number>
}>()

const formatAverage = (playerId: string) => {
  const avg = props.statsByPlayer?.[playerId]?.average ?? 0
  return avg.toFixed(1)
}

const formatCheckout = (playerId: string) => {
  const entry = props.statsByPlayer?.[playerId]
  // When the underlying calculator reports 0 attempts (single-out
  // match, or no checkout reached yet) we render an em-dash rather
  // than a stale "0%".
  if (entry?.checkoutAttempts === 0) return '—'
  const rate = entry?.checkoutRate ?? 0
  return `${Math.round(rate)}%`
}

const usesSets = computed(() => props.matchFormat?.useSets ?? false)
const targetSets = computed(() => props.matchFormat?.setsToWin ?? 1)
const targetLegsPerSet = computed(() => props.matchFormat?.legsPerSet ?? props.matchFormat?.legsToWin ?? 1)
const targetLegsOnly = computed(() => props.matchFormat?.fixedLegs ?? props.matchFormat?.legsToWin ?? 1)

const legWins = computed(() => props.legWins ?? {})
const setWins = computed(() => props.setWins ?? {})
const setLegWins = computed(() => props.setLegWins ?? {})
</script>
