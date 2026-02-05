<template>
  <div class="bg-white border-2 border-border rounded-2xl p-5 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-foreground">{{ title }}</h3>
      <span class="text-xs font-semibold text-muted-foreground">{{ rows.length }} Spieler</span>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-[900px] w-full text-xs border-collapse">
        <thead>
          <tr class="text-muted-foreground">
            <th class="text-left font-semibold py-2 px-2">Rang</th>
            <th class="text-left font-semibold py-2 px-2">Spielername</th>
            <th class="text-center font-semibold py-2 px-2">Spiele</th>
            <th class="text-center font-semibold py-2 px-2">Siege</th>
            <th class="text-center font-semibold py-2 px-2">Niederl.</th>
            <th class="text-center font-semibold py-2 px-2">Legs +</th>
            <th class="text-center font-semibold py-2 px-2">Legs -</th>
            <th class="text-center font-semibold py-2 px-2">Diff</th>
            <th class="text-center font-semibold py-2 px-2">Average</th>
            <th class="text-center font-semibold py-2 px-2">180er</th>
            <th class="text-center font-semibold py-2 px-2">High Finish</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="row.playerId"
            class="border-t border-dashed border-border text-foreground"
            :class="index < qualifierCount ? 'bg-primary/5' : ''"
          >
            <td
              class="py-2 px-2 font-semibold relative"
              :class="index < qualifierCount ? 'pl-4' : ''"
            >
              <span
                v-if="index < qualifierCount"
                class="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"
              />
              <span
                class="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 text-[11px] font-bold"
                :class="index < qualifierCount
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground'"
              >
                {{ index + 1 }}
              </span>
            </td>
            <td class="py-2 px-2 font-semibold">
              <div class="flex items-center gap-2">
                <span>{{ playerName(row.playerId) }}</span>
                <span
                  v-if="index < qualifierCount"
                  class="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full"
                >
                  Qualifiziert
                </span>
              </div>
            </td>
            <td class="py-2 px-2 text-center">{{ row.played }}</td>
            <td class="py-2 px-2 text-center">{{ row.wins }}</td>
            <td class="py-2 px-2 text-center">{{ row.losses }}</td>
            <td class="py-2 px-2 text-center">{{ row.legsWon }}</td>
            <td class="py-2 px-2 text-center">{{ row.legsLost }}</td>
            <td class="py-2 px-2 text-center font-semibold" :class="row.legsDiff >= 0 ? 'text-primary' : 'text-destructive'">
              {{ row.legsDiff }}
            </td>
            <td class="py-2 px-2 text-center">{{ row.average.toFixed(2) }}</td>
            <td class="py-2 px-2 text-center">{{ row.count180 }}</td>
            <td class="py-2 px-2 text-center">{{ row.highestCheckout || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
interface StandingsRow {
  playerId: string
  played: number
  wins: number
  losses: number
  legsWon: number
  legsLost: number
  legsDiff: number
  average: number
  count180: number
  highestCheckout: number
}

const props = withDefaults(
  defineProps<{
    title: string
    rows: StandingsRow[]
    playerName: (playerId: string) => string
    qualifierCount?: number
  }>(),
  { qualifierCount: 0 }
)
const qualifierCount = computed(() => props.qualifierCount)
</script>
