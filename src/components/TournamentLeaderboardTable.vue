<template>
  <div class="bg-white border-2 border-border rounded-2xl p-4 sm:p-5 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base sm:text-lg font-bold text-foreground">{{ title }}</h3>
      <span class="text-xs font-semibold text-muted-foreground">{{ rows.length }} Spieler</span>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 items-stretch">
      <!-- flex flex-col + h-full so every category card stretches to the
           grid-row height; the "+N weitere" button uses mt-auto to stick
           to the bottom edge regardless of how many player rows are
           inside. Without this, cards in the same row could end at
           different vertical positions on desktop, making the
           "Bestes Leg" / "Checkout Quote" cards look out of line. -->
      <section
        v-for="category in categories"
        :key="category.key"
        class="flex flex-col h-full rounded-2xl border-2 border-border bg-muted/20 overflow-hidden"
      >
        <div class="shrink-0 px-4 py-3 bg-white border-b-2 border-border">
          <div class="text-sm font-black text-foreground">{{ category.title }}</div>
          <div class="text-[11px] font-semibold text-muted-foreground">{{ category.subtitle }}</div>
        </div>
        <div class="flex-1 divide-y divide-border/70">
          <!-- Each row carries min-h-[48px] so rows align across cards
               even when only some categories have a `detail` subtitle
               (e.g. "Bestes Leg" / "Checkout Quote" have one, "Average"
               doesn't). -->
          <div
            v-for="(row, index) in visibleRows(category)"
            :key="`${category.key}-${row.playerId}`"
            class="flex items-center justify-between gap-3 px-4 py-3 min-h-[52px]"
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
        <button
          v-if="category.rows.length > DEFAULT_LIMIT"
          type="button"
          class="mt-auto w-full px-4 py-2.5 text-xs font-bold text-primary bg-white border-t-2 border-border hover:bg-muted/30 transition-colors flex items-center justify-center gap-1.5 shrink-0"
          @click="toggleExpanded(category.key)"
        >
          <template v-if="expanded[category.key]">
            <i class="pi pi-chevron-up text-[10px]" />
            Weniger anzeigen
          </template>
          <template v-else>
            <i class="pi pi-chevron-down text-[10px]" />
            +{{ category.rows.length - DEFAULT_LIMIT }} weitere
          </template>
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface LeaderboardRow {
  playerId: string
  name: string
  average: number
  checkoutRate: number
  checkoutAttempts: number
  checkoutHits: number
  count60Plus: number
  count100Plus: number
  count140Plus: number
  count180: number
  highestScore: number
  highestCheckout: number
  bestLegDarts: number
  totalDarts: number
}

interface Category {
  key: string
  title: string
  subtitle: string
  rows: LeaderboardRow[]
  value: (row: LeaderboardRow) => string
  detail: (row: LeaderboardRow) => string
}

const props = defineProps<{
  title: string
  rows: LeaderboardRow[]
}>()

const DEFAULT_LIMIT = 5

const expanded = ref<Record<string, boolean>>({})
const toggleExpanded = (key: string) => {
  expanded.value[key] = !expanded.value[key]
}
const visibleRows = (category: Category) =>
  expanded.value[category.key] ? category.rows : category.rows.slice(0, DEFAULT_LIMIT)

const byName = (a: LeaderboardRow, b: LeaderboardRow) => a.name.localeCompare(b.name, 'de-CH')
const sortDesc = (selector: (row: LeaderboardRow) => number) =>
  [...props.rows].sort((a, b) => selector(b) - selector(a) || byName(a, b))
const sortBestLeg = () =>
  [...props.rows].sort((a, b) => {
    const valueA = a.bestLegDarts || Number.POSITIVE_INFINITY
    const valueB = b.bestLegDarts || Number.POSITIVE_INFINITY
    return valueA - valueB || byName(a, b)
  })

const categories = computed<Category[]>(() => [
  {
    key: 'average',
    title: 'Average',
    subtitle: '3-Dart-Schnitt',
    rows: sortDesc((row) => row.average),
    value: (row: LeaderboardRow) => row.average.toFixed(2),
    detail: () => ''
  },
  {
    key: 'highest-score',
    title: 'Höchster Wurf',
    subtitle: 'Beste Aufnahme',
    rows: sortDesc((row) => row.highestScore),
    value: (row: LeaderboardRow) => row.highestScore ? String(row.highestScore) : '-',
    detail: () => ''
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
    subtitle: 'Aufnahmen = 180',
    rows: sortDesc((row) => row.count180),
    value: (row: LeaderboardRow) => String(row.count180),
    detail: () => ''
  },
  {
    key: 'checkout',
    title: 'Checkout Quote',
    subtitle: 'Treffer auf Checkout',
    rows: sortDesc((row) => row.checkoutRate),
    value: (row: LeaderboardRow) => `${row.checkoutRate.toFixed(0)}%`,
    detail: (row: LeaderboardRow) => `${row.checkoutHits}/${row.checkoutAttempts}`
  },
  {
    key: 'high-finish',
    title: 'High Finish',
    subtitle: 'Höchster Checkout',
    rows: sortDesc((row) => row.highestCheckout),
    value: (row: LeaderboardRow) => row.highestCheckout ? String(row.highestCheckout) : '-',
    detail: () => ''
  },
  {
    key: '140-plus',
    title: '140+ Aufnahmen',
    subtitle: 'Aufnahmen 140 – 179',
    rows: sortDesc((row) => row.count140Plus),
    value: (row: LeaderboardRow) => String(row.count140Plus),
    detail: () => ''
  },
  {
    key: '100-plus',
    title: '100+ Aufnahmen',
    subtitle: 'Aufnahmen 100 – 139',
    rows: sortDesc((row) => row.count100Plus),
    value: (row: LeaderboardRow) => String(row.count100Plus),
    detail: () => ''
  },
  {
    key: '60-plus',
    title: '60+ Aufnahmen',
    subtitle: 'Aufnahmen 60 – 99',
    rows: sortDesc((row) => row.count60Plus),
    value: (row: LeaderboardRow) => String(row.count60Plus),
    detail: () => ''
  }
])
</script>
