import { defineStore } from 'pinia'
import type { Player } from '@/domain/models'

interface PlayersState {
  players: Player[]
  storageKey: string
}

const buildKey = (userId?: string | null) => (userId ? `checkout-players-${userId}` : 'checkout-players')

const loadPlayers = (storageKey: string): Player[] => {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Player[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const persistPlayers = (storageKey: string, players: Player[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(players))
}

export const usePlayersStore = defineStore('players', {
  state: (): PlayersState => ({
    players: [],
    storageKey: buildKey()
  }),
  actions: {
    setUserScope(userId: string | null) {
      this.storageKey = buildKey(userId)
      this.players = userId ? loadPlayers(this.storageKey) : []
    },
    addPlayer(player: Player) {
      if (this.players.find((existing) => existing.id === player.id)) return
      this.players.push(player)
      persistPlayers(this.storageKey, this.players)
    },
    removePlayer(playerId: string) {
      this.players = this.players.filter((player) => player.id !== playerId)
      persistPlayers(this.storageKey, this.players)
    },
    upsertPlayer(player: Player) {
      const index = this.players.findIndex((existing) => existing.id === player.id)
      if (index >= 0) {
        this.players[index] = player
      } else {
        this.players.push(player)
      }
      persistPlayers(this.storageKey, this.players)
    }
  }
})
