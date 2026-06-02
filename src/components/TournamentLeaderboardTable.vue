<template>
  <div class="bg-white border-2 border-border rounded-2xl p-5 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-foreground">{{ title }}</h3>
      <span class="text-xs font-semibold text-muted-foreground">{{ rows.length }} Spieler</span>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <section
        v-for="category in categories"
        :key="category.key"
        class="rounded-2xl border-2 border-border bg-muted/20 overflow-hidden"
      >
        <div class="px-4 py-3 bg-white border-b-2 border-border">
          <div class="text-sm font-black text-foreground">{{ category.title }}</div>
          <div class="text-[11px] font-semibold text-muted-foreground">{{ category.subtitle }}</div>
        </div>
        <div class="divide-y divide-border/70">
          <div
            v-for="(row, index) in category.rows"
            :key="`${category.key}-${row.playerId}`"
            class="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div class="min-w-0">
              <div class="text-[11px] font-black text-muted-foreground">#{{ index + 1 }}</div>
              <div class="text-sm font-bold text-foreground truncate">{{ row.name }}</div>
            </div>
            <div class="text-right">
              <div class="text-lg font-black text-primary">{{ category.value(row) }}</div>
              <div v-if="category.detail(row)" class="text-[11px] font-semibold text-muted-foreground">
                {{ category.detail(row) }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface LeaderboardRow {
  playerId: string
  name: string
  average: number
  checkoutRate: number
  checkoutAttempts: number
  checkoutHits: number
  count100Plus: number
  count140Plus: number
  count180: number
  highestScore: number
  highestCheckout: number
  bestLegDarts: number
  totalDarts: number
}

const props = defineProps<{
  title: string
  rows: LeaderboardRow[]
}>()

const byName = (a: LeaderboardRow, b: LeaderboardRow) => a.name.localeCompare(b.name, 'de-CH')
const sortDesc = (selector: (row: LeaderboardRow) => number) =>
  [...props.rows].sort((a, b) => selector(b) - selector(a) || byName(a, b))
const sortBestLeg = () =>
  [...props.rows].sort((a, b) => {
    const valueA = a.bestLegDarts || Number.POSITIVE_INFINITY
    const valueB = b.bestLegDarts || Number.POSITIVE_INFINITY
    return valueA - valueB || byName(a, b)
  })

const categories = computed(() => [
  {
    key: 'average',
    title: 'Average',
    subtitle: '3-Dart-Schnitt',
    rows: sortDesc((row) => row.average),
    value: (row: LeaderboardRow) => row.average.toFixed(2),
    detail: (row: LeaderboardRow) => `${row.totalDarts} Darts`
  },
  {
    key: 'highest-score',
    title: 'Höchster Wurf',
    subtitle: 'Beste Aufnahme',
    rows: sortDesc((row) => row.highestScore),
    value: (row: LeaderboardRow) => row.highestScore ? String(row.highestScore) : '-',
    detail: (row: LeaderboardRow) => `${row.count100Plus}x 100+`
  },
  {
    key: 'best-leg',
    title: 'Bestes Leg',
    subtitle: 'Wenigste Darts',
    rows: sortBestLeg(),
    value: (row: LeaderboardRow) => row.bestLegDarts ? `${row.bestLegDarts}` : '-',
    detail: (row: LeaderboardRow) => row.bestLegDarts ? 'Darts' : 'Noch kein Leg'
  },
  {
    key: '180',
    title: '180',
    subtitle: 'Maximums',
    rows: sortDesc((row) => row.count180),
    value: (row: LeaderboardRow) => String(row.count180),
    detail: (row: LeaderboardRow) => `${row.count140Plus}x 140+`
  },
  {
    key: 'checkout',
    title: 'Checkout Quote',
    subtitle: 'Treffer auf Checkout',
    rows: sortDesc((row) => row.checkoutRate),
    value: (row: LeaderboardRow) => `${row.checkoutRate.toFixed(0)}%`,
    detail: (row: LeaderboardRow) => `${row.checkoutHits}/${row.checkoutAttempts}`
  }
])
</script>
