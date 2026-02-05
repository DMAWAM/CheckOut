import Dexie, { Table } from 'dexie'
import type {
  Player,
  Match,
  Leg,
  Turn,
  Tournament,
  TournamentPlayer,
  TournamentMatchLink
} from '@/domain/models'

export class DartDb extends Dexie {
  players!: Table<Player, string>
  matches!: Table<Match, string>
  legs!: Table<Leg, string>
  turns!: Table<Turn, string>
  tournaments!: Table<Tournament, string>
  tournamentPlayers!: Table<TournamentPlayer, [string, string]>
  tournamentMatchLinks!: Table<TournamentMatchLink, [string, string]>

  constructor() {
    super('dart-score-db')

    this.version(1).stores({
      players: 'id, name, createdAt',
      matches: 'id, createdAt, status, winnerId, tournamentId',
      legs: 'id, matchId, legNumber, winnerId',
      turns: 'id, legId, playerId, turnIndex, checkoutHit',
      tournaments: 'id, date, status',
      tournamentPlayers: '[tournamentId+playerId], tournamentId, playerId',
      tournamentMatchLinks: '[tournamentId+matchId], tournamentId, matchId'
    })
  }
}

export const db = new DartDb()
