import { defineStore } from 'pinia'

interface StatsState {
  lastUpdated: string | null
}

export const useStatsStore = defineStore('stats', {
  state: (): StatsState => ({
    lastUpdated: null
  })
})
