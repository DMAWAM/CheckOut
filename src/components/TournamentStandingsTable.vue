<template>
  <div class="bg-white border-2 border-border rounded-2xl p-4 sm:p-5 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base sm:text-lg font-bold text-foreground">{{ title }}</h3>
      <span class="text-xs font-semibold text-muted-foreground">{{ rows.length }} Spieler</span>
    </div>

    <p class="md:hidden text-[11px] text-muted-foreground font-semibold mb-2">
      <i class="pi pi-arrows-h text-[10px] mr-1" />
      Tabelle seitlich wischen für mehr Spalten.
    </p>

    <div class="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0" style="-webkit-overflow-scrolling: touch;">
      <table class="min-w-[900px] w-full text-xs border-collapse">
        <thead>
          <tr class="text-muted-foreground">
            <th class="text-left font-semibold py-2 px-2">Rang</th>
            <th class="text-left font-semibold py-2 px-2">Spielername</th>
            <th class="text-center font-semibold py-2 px-2">Spiele</th>
            <th class="text-center font-semibold py-2 px-2">Punkte</th>
            <th class="text-center font-semibold py-2 px-2">Siege</th>
            <th class="text-center font-semibold py-2 px-2">Remis</th>
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
            :class="qualifierRowClass(row, index)"
          >
            <td
              class="py-2 px-2 font-semibold relative"
              :class="qualifierKind(row, index) ? 'pl-4' : ''"
            >
              <span
                v-if="qualifierKind(row, index)"
                class="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                :class="qualifierKind(row, index) === 'wildcard' ? 'bg-dart-gold' : 'bg-primary'"
              />
              <span
                class="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 text-[11px] font-bold"
                :class="qualifierRankClass(row, index)"
              >
                {{ index + 1 }}
              </span>
            </td>
            <td class="py-2 px-2 font-semibold">
              <div class="flex items-center gap-2">
                <span>{{ playerName(row.playerId) }}</span>
              </div>
            </td>
            <td class="py-2 px-2 text-center">{{ row.played }}</td>
            <td class="py-2 px-2 text-center font-black text-primary">{{ row.points }}</td>
            <td class="py-2 px-2 text-center">{{ row.wins }}</td>
            <td class="py-2 px-2 text-center">{{ row.draws }}</td>
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
interface StandingsRow {
  playerId: string
  played: number
  points: number
  wins: number
  draws: number
  losses: number
  legsWon: number
  legsLost: number
  legsDiff: number
  average: number
  count180: number
  highestCheckout: number
}

type QualifierKind = 'direct' | 'wildcard'

const props = withDefaults(
  defineProps<{
    title: string
    rows: StandingsRow[]
    playerName: (playerId: string) => string
    qualifierCount?: number
    qualifierStatus?: Record<string, QualifierKind>
  }>(),
  { qualifierCount: 0 }
)

const qualifierKind = (row: StandingsRow, index: number): QualifierKind | undefined => {
  const status = props.qualifierStatus?.[row.playerId]
  if (status) return status
  return index < props.qualifierCount ? 'direct' : undefined
}

const qualifierRowClass = (row: StandingsRow, index: number) => {
  const kind = qualifierKind(row, index)
  if (kind === 'wildcard') return 'bg-dart-gold/10'
  if (kind === 'direct') return 'bg-primary/5'
  return ''
}

const qualifierRankClass = (row: StandingsRow, index: number) => {
  const kind = qualifierKind(row, index)
  if (kind === 'wildcard') return 'border-dart-gold text-dart-gold bg-dart-gold/10'
  if (kind === 'direct') return 'border-primary text-primary bg-primary/10'
  return 'border-border text-muted-foreground'
}
</script>
