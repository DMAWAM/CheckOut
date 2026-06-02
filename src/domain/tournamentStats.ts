import type { TournamentMatch, TournamentMatchResult, TournamentPhase } from './models'

export interface StandingsRow {
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

export interface LeaderboardRow {
  playerId: string
  name: string
  average: number
  checkoutRate: number
  checkoutAttempts: number
  checkoutHits: number
  doubleDarts: number
  count60Plus: number
  count100Plus: number
  count140Plus: number
  count180: number
  totalDarts: number
  totalPoints: number
  highestScore: number
  highestCheckout: number
  bestLegDarts: number
  isWinner: boolean
}

export const calculateStandingsFromData = (params: {
  playerIds: string[]
  matches: TournamentMatch[]
  results: TournamentMatchResult[]
  phase: TournamentPhase | 'all'
  groupIndex?: number
}) => {
  const stats: Record<
    string,
    {
      wins: number
      draws: number
      losses: number
      points: number
      played: number
      legsWon: number
      legsLost: number
      totalPoints: number
      totalDarts: number
      count180: number
      highestCheckout: number
    }
  > = {}
  params.playerIds.forEach((playerId) => {
    stats[playerId] = {
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      played: 0,
      legsWon: 0,
      legsLost: 0,
      totalPoints: 0,
      totalDarts: 0,
      count180: 0,
      highestCheckout: 0
    }
  })

  const filteredMatches = params.matches.filter((match) => {
    if (match.status !== 'finished') return false
    if (match.playerAId === match.playerBId) return false
    if (params.groupIndex !== undefined && (match.groupIndex ?? 0) !== params.groupIndex) return false
    if (params.phase === 'all') return true
    return match.phase === params.phase
  })

  filteredMatches.forEach((match) => {
    const result = params.results.find((entry) => entry.matchId === match.id)
    if (!result) return
    const winnerId = match.winnerId
    const participantIds = [match.playerAId, match.playerBId].filter((playerId) => stats[playerId])
    participantIds.forEach((playerId) => {
      stats[playerId].played += 1
    })

    if (winnerId && stats[winnerId]) {
      const loserId = winnerId === match.playerAId ? match.playerBId : match.playerAId
      stats[winnerId].wins += 1
      stats[winnerId].points += 3
      if (stats[loserId]) {
        stats[loserId].losses += 1
      }
    } else {
      participantIds.forEach((playerId) => {
        stats[playerId].draws += 1
        stats[playerId].points += 1
      })
    }

    result.stats.forEach((stat) => {
      if (!stats[stat.playerId]) return
      stats[stat.playerId].legsWon += stat.legsWon ?? 0
      stats[stat.playerId].legsLost += stat.legsLost ?? 0
      stats[stat.playerId].totalPoints += stat.totalPoints ?? 0
      stats[stat.playerId].totalDarts += stat.totalDarts ?? 0
      stats[stat.playerId].count180 += stat.count180 ?? 0
      stats[stat.playerId].highestCheckout = Math.max(
        stats[stat.playerId].highestCheckout,
        stat.highestCheckout ?? 0
      )
    })
  })

  return params.playerIds
    .map((playerId) => {
      const row = stats[playerId]
      const average = row.totalDarts === 0 ? 0 : (row.totalPoints / row.totalDarts) * 3
      return {
        playerId,
        points: row.points,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        played: row.played,
        legsWon: row.legsWon,
        legsLost: row.legsLost,
        legsDiff: row.legsWon - row.legsLost,
        average,
        count180: row.count180,
        highestCheckout: row.highestCheckout
      }
    })
    .sort((a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.legsDiff - a.legsDiff ||
      b.legsWon - a.legsWon ||
      b.average - a.average
    )
}

export const calculateLeaderboardsFromData = (
  results: TournamentMatchResult[],
  players: Array<{ playerId: string; name: string }> = []
): LeaderboardRow[] => {
  const totals: Record<string, LeaderboardRow> = {}

  players.forEach((player) => {
    totals[player.playerId] = {
      playerId: player.playerId,
      name: player.name,
      average: 0,
      checkoutRate: 0,
      checkoutAttempts: 0,
      checkoutHits: 0,
      doubleDarts: 0,
      count60Plus: 0,
      count100Plus: 0,
      count140Plus: 0,
      count180: 0,
      totalDarts: 0,
      totalPoints: 0,
      highestScore: 0,
      highestCheckout: 0,
      bestLegDarts: 0,
      isWinner: false
    }
  })

  results.forEach((entry) => {
    entry.stats.forEach((stat) => {
      if (!totals[stat.playerId]) {
        totals[stat.playerId] = {
          ...stat,
          average: stat.average ?? 0,
          checkoutRate: stat.checkoutRate ?? 0,
          checkoutAttempts: stat.checkoutAttempts ?? 0,
          checkoutHits: stat.checkoutHits ?? 0,
          doubleDarts: stat.doubleDarts ?? 0,
          count60Plus: stat.count60Plus ?? 0,
          count100Plus: stat.count100Plus ?? 0,
          count140Plus: stat.count140Plus ?? 0,
          count180: stat.count180 ?? 0,
          totalDarts: stat.totalDarts ?? 0,
          totalPoints: stat.totalPoints ?? 0,
          highestScore: stat.highestScore ?? 0,
          highestCheckout: stat.highestCheckout ?? 0,
          bestLegDarts: stat.bestLegDarts ?? 0,
          isWinner: false
        }
        return
      }
      const current = totals[stat.playerId]
      current.checkoutAttempts += stat.checkoutAttempts ?? 0
      current.checkoutHits += stat.checkoutHits ?? 0
      current.doubleDarts += stat.doubleDarts ?? 0
      current.count60Plus += stat.count60Plus ?? 0
      current.count100Plus += stat.count100Plus ?? 0
      current.count140Plus += stat.count140Plus ?? 0
      current.count180 += stat.count180 ?? 0
      current.totalDarts += stat.totalDarts ?? 0
      current.totalPoints += stat.totalPoints ?? 0
      current.highestScore = Math.max(current.highestScore, stat.highestScore ?? 0)
      current.highestCheckout = Math.max(current.highestCheckout, stat.highestCheckout ?? 0)
      const bestLegDarts = stat.bestLegDarts ?? 0
      if (bestLegDarts > 0) {
        current.bestLegDarts =
          current.bestLegDarts === 0 ? bestLegDarts : Math.min(current.bestLegDarts, bestLegDarts)
      }
    })
  })

  return Object.values(totals).map((stat) => {
    const average = stat.totalDarts === 0 ? 0 : (stat.totalPoints / stat.totalDarts) * 3
    const checkoutRate = stat.checkoutAttempts === 0 ? 0 : (stat.checkoutHits / stat.checkoutAttempts) * 100
    return {
      ...stat,
      average,
      checkoutRate
    }
  })
}
