<template>
  <div v-if="turns.length > 0" class="px-4">
    <div class="bg-white border-2 border-border rounded-xl p-3">
      <div class="text-xs font-bold text-muted-foreground mb-2">Letzte Aufnahmen</div>
      <div class="space-y-1.5">
        <div
          v-for="turn in turns"
          :key="turn.id"
          class="flex items-center justify-between bg-muted rounded-lg px-3 py-2"
          :class="turn.bust
            ? 'border-l-4 border-destructive'
            : turn.checkoutHit
              ? 'border-l-4 border-dart-gold'
              : ''"
        >
          <div class="text-sm font-bold truncate flex-1 text-foreground">
            {{ playerName(turn.playerId) }}
          </div>
          <div class="flex items-center gap-2">
            <div class="text-lg font-black text-foreground">
              {{ turn.points }}
            </div>
            <div class="text-xs text-muted-foreground">→ {{ turn.bust ? turn.startedScore : turn.startedScore - turn.points }}</div>
            <i v-if="turn.bust" class="pi pi-times text-destructive" />
            <i v-else-if="turn.checkoutHit" class="pi pi-star text-dart-gold" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Player, Turn } from '@/domain/models'

const props = defineProps<{ turns: Turn[]; players: Player[] }>()

const playerName = (id: string) => props.players.find((player) => player.id === id)?.name ?? 'Unbekannt'
</script>
