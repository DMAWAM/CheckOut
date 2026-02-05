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
            <th class="text-left font-semibold py-2 px-2">Spieler</th>
            <th class="text-center font-semibold py-2 px-2">Average</th>
            <th class="text-center font-semibold py-2 px-2">CO%</th>
            <th class="text-center font-semibold py-2 px-2">100+</th>
            <th class="text-center font-semibold py-2 px-2">140+</th>
            <th class="text-center font-semibold py-2 px-2">180</th>
            <th class="text-center font-semibold py-2 px-2">High Finish</th>
            <th class="text-center font-semibold py-2 px-2">Darts</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.playerId"
            class="border-t border-dashed border-border text-foreground"
          >
            <td class="py-2 px-2 font-semibold">{{ row.name }}</td>
            <td class="py-2 px-2 text-center">{{ row.average.toFixed(2) }}</td>
            <td class="py-2 px-2 text-center">{{ row.checkoutRate.toFixed(0) }}%</td>
            <td class="py-2 px-2 text-center">{{ row.count100Plus }}</td>
            <td class="py-2 px-2 text-center">{{ row.count140Plus }}</td>
            <td class="py-2 px-2 text-center">{{ row.count180 }}</td>
            <td class="py-2 px-2 text-center">{{ row.highestCheckout || '-' }}</td>
            <td class="py-2 px-2 text-center">{{ row.totalDarts }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LeaderboardRow {
  playerId: string
  name: string
  average: number
  checkoutRate: number
  count100Plus: number
  count140Plus: number
  count180: number
  highestCheckout: number
  totalDarts: number
}

defineProps<{
  title: string
  rows: LeaderboardRow[]
}>()
</script>
