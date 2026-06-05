<template>
  <div class="bg-white border-4 border-border rounded-3xl px-6 py-5 sm:px-8 sm:py-6 shadow-xl">
    <div class="flex items-center justify-between mb-4">
      <div class="text-xs sm:text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {{ phaseLabel }}
        <span v-if="groupLabel"> · {{ groupLabel }}</span>
      </div>
      <div class="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-destructive">
        <span class="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
        LIVE
      </div>
    </div>

    <div class="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
      <template v-for="player in players" :key="player.id">
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="text-2xl sm:text-3xl shrink-0 w-8 text-primary"
            :class="player.id === snapshot.activePlayerId ? 'opacity-100' : 'opacity-0'"
          >
            <i class="pi pi-caret-right" />
          </span>
          <span class="text-3xl sm:text-5xl font-black text-foreground truncate">
            {{ playerName(player.id) }}
          </span>
        </div>
        <div class="flex items-baseline justify-end gap-4 sm:gap-6">
          <div class="text-right">
            <div class="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-muted-foreground leading-none">
              {{ usesSets ? 'Sätze' : 'Legs' }}
            </div>
            <div class="text-3xl sm:text-5xl font-black text-foreground leading-none mt-1">
              {{ legCounter(player.id) }}
            </div>
          </div>
          <div class="text-right min-w-[3.5rem] sm:min-w-[5rem]">
            <div class="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-muted-foreground leading-none">
              Rest
            </div>
            <div class="text-4xl sm:text-7xl font-black text-primary leading-none mt-1 tabular-nums">
              {{ snapshot.scores[player.id] ?? '–' }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LiveMatchSnapshot } from '@/domain/liveMatch'

const props = defineProps<{
  snapshot: LiveMatchSnapshot
  playerName: (playerId: string) => string
  phaseLabel?: string
  groupLabel?: string
}>()

const players = computed(() => props.snapshot.players)

const usesSets = computed(() => Boolean(props.snapshot.match.format?.useSets))

const legCounter = (playerId: string) => {
  if (usesSets.value) {
    const sets = props.snapshot.setWins?.[playerId] ?? 0
    const legs = props.snapshot.setLegWins?.[playerId] ?? 0
    return `${sets}:${legs}`
  }
  return props.snapshot.legWins?.[playerId] ?? 0
}
</script>
