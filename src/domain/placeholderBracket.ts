import type { TournamentMatch, TournamentMode } from './models'
import { seedSlots } from './knockoutSeeding'

const groupLetter = (groupIndex: number) => String.fromCharCode(65 + groupIndex)

const wildcardSeedLabel = (wildcardRank: number) =>
  wildcardRank === 3 ? 'bester Drittplatzierter' : `bester ${wildcardRank}.-Platzierter`

const labelForSeedNumber = (
  seedNumber: number,
  perGroup: number,
  groupCount: number
): string => {
  const groups = Math.max(1, groupCount)
  for (let tier = 1; tier <= perGroup; tier += 1) {
    const tierStart = (tier - 1) * groups + 1
    if (seedNumber >= tierStart && seedNumber < tierStart + groups) {
      const rankInTier = seedNumber - tierStart + 1
      const tierLabel =
        tier === 1
          ? 'Gruppensieger'
          : tier === 2
            ? 'Gruppenzweiter'
            : `${tier}.-Platzierter Gruppe`
      return `${rankInTier}. ${tierLabel}`
    }
  }
  const wildcardIndex = seedNumber - perGroup * groups
  return `${wildcardIndex}. ${wildcardSeedLabel(perGroup + 1)}`
}

/**
 * Visual-slot-ordered labels for a `combined` tournament's KO bracket
 * before any real matches exist. Slot N's label describes who will land
 * there once the group phase is decided ("1. Gruppensieger", etc.).
 */
export const buildCombinedSeedLabels = (
  groupCount: number,
  bracketSize: number
): string[] => {
  if (bracketSize <= 0) {
    const labels: string[] = []
    for (let groupIdx = 0; groupIdx < groupCount; groupIdx += 1) {
      const label = groupLetter(groupIdx)
      labels.push(`1. Gruppe ${label}`)
      labels.push(`2. Gruppe ${label}`)
    }
    return labels
  }
  const perGroup = Math.floor(bracketSize / Math.max(1, groupCount))
  const slots = seedSlots(bracketSize)
  return slots.map((seedNumber) => labelForSeedNumber(seedNumber, perGroup, groupCount))
}

export interface BracketScaffoldInput {
  mode: TournamentMode
  groupCount: number
  bracketSize: number
  /** Player IDs in seed order — only used for pure knockout tournaments. */
  knockoutPlayerIds: string[]
}

/**
 * Seed identifiers in bracket-visual-slot order. For combined tournaments
 * these are synthetic `seed-N` IDs that resolve to placeholder labels;
 * for pure knockout tournaments they are the actual player IDs.
 */
export const buildSeedIds = (input: BracketScaffoldInput): string[] => {
  if (input.mode === 'combined') {
    return buildCombinedSeedLabels(input.groupCount, input.bracketSize).map(
      (_, index) => `seed-${index}`
    )
  }
  if (input.mode === 'knockout') return [...input.knockoutPlayerIds]
  return []
}

/**
 * Build a fully-virtual bracket so the bracket view can render before any
 * real matches exist. The R2+ `order` scheme uses `round * 1000 + i + 1`
 * to line up with real matches once they are created, and the pairingMode
 * matches the seeding rule used by the real bracket builder.
 */
export const buildPlaceholderMatches = (
  seedIds: string[],
  tournamentId: string,
  pairingMode: 'consecutive' | 'first-last' = 'first-last'
): TournamentMatch[] => {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(seedIds.length, 2))))
  const seeds = [...seedIds]
  while (seeds.length < size) seeds.push('TBD')
  const rounds = Math.max(1, Math.log2(size))
  const matches: TournamentMatch[] = []
  let gameNumber = 1
  let previousRoundIds: string[] = []

  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = size / Math.pow(2, round)
    const currentRoundIds: string[] = []
    for (let index = 0; index < matchCount; index += 1) {
      let playerAId = 'TBD'
      let playerBId = 'TBD'
      if (round === 1) {
        if (pairingMode === 'consecutive') {
          playerAId = seeds[index * 2] ?? 'TBD'
          playerBId = seeds[index * 2 + 1] ?? 'TBD'
        } else {
          playerAId = seeds[index] ?? 'TBD'
          playerBId = seeds[size - 1 - index] ?? 'TBD'
        }
      } else {
        const left = previousRoundIds[index * 2]
        const right = previousRoundIds[index * 2 + 1]
        playerAId = left ? `winner:${left}` : 'TBD'
        playerBId = right ? `winner:${right}` : 'TBD'
      }
      const id = `game-${gameNumber}`
      currentRoundIds.push(id)
      matches.push({
        id,
        tournamentId,
        phase: 'knockout',
        round,
        order: round === 1 ? index + 1 : round * 1000 + index + 1,
        playerAId,
        playerBId,
        status: 'pending'
      })
      gameNumber += 1
    }
    previousRoundIds = currentRoundIds
  }
  return matches
}

/**
 * Merge real KO matches into the placeholder bracket, replacing the
 * corresponding placeholder slots so the view can blend "real progress"
 * with the still-virtual future rounds.
 */
export const mergeKnockoutMatches = (
  placeholder: TournamentMatch[],
  real: TournamentMatch[]
): TournamentMatch[] => {
  if (real.length === 0) return placeholder

  const placeholderByRound = new Map<number, TournamentMatch[]>()
  placeholder.forEach((match) => {
    const list = placeholderByRound.get(match.round) ?? []
    list.push(match)
    placeholderByRound.set(match.round, list)
  })
  placeholderByRound.forEach((list) => list.sort((a, b) => a.order - b.order))

  const actualByRound = new Map<number, TournamentMatch[]>()
  real.forEach((match) => {
    const list = actualByRound.get(match.round) ?? []
    list.push(match)
    actualByRound.set(match.round, list)
  })
  actualByRound.forEach((list) => list.sort((a, b) => a.order - b.order))

  const merged = [...placeholder]
  actualByRound.forEach((list, round) => {
    const placeholders = placeholderByRound.get(round) ?? []
    list.forEach((match, index) => {
      const target = placeholders[index]
      if (!target) {
        merged.push(match)
        return
      }
      const targetIndex = merged.findIndex((entry) => entry.id === target.id)
      if (targetIndex >= 0) merged[targetIndex] = match
    })
  })
  return merged
}
