import type { StandingsRow } from './tournamentStats'

export interface QualifierEntry {
  playerId: string
  /** 0-based index of the source group */
  groupIndex: number
  /** 1-based rank inside that group (1 = group winner) */
  rankInGroup: number
  points: number
  wins: number
  legsDiff: number
  average: number
}

/**
 * Pick the players that advance from the group stage into a knockout bracket
 * of the requested size.
 *
 * Cases:
 * - bracketSize divides evenly into groupCount → top N from each group
 *   (e.g. 16 / 4 = 4 → top 4 of each group)
 * - bracketSize doesn't divide evenly → top floor(N) from each group, then
 *   fill the remaining slots with the best "rank-(floor(N)+1)" players
 *   across all groups (e.g. 16 / 6 = 2 remainder 4 → top 2 + best 4 thirds)
 *
 * If bracketSize is missing / 0, falls back to the legacy "top 2 per group"
 * behaviour.
 */
export const computeQualifiers = (params: {
  bracketSize?: number
  groupCount: number
  standingsByGroup: Map<number, StandingsRow[]>
}): QualifierEntry[] => {
  const { bracketSize, groupCount, standingsByGroup } = params
  if (groupCount < 1) return []

  // Legacy mode: top 2 per group, no fill-up.
  if (!bracketSize || bracketSize <= 0) {
    const out: QualifierEntry[] = []
    for (let g = 0; g < groupCount; g += 1) {
      const standings = standingsByGroup.get(g) ?? []
      standings.slice(0, 2).forEach((row, idx) => {
        out.push({
          playerId: row.playerId,
          groupIndex: g,
          rankInGroup: idx + 1,
          points: row.points,
          wins: row.wins,
          legsDiff: row.legsDiff,
          average: row.average
        })
      })
    }
    return out
  }

  const baseQualifiers = Math.floor(bracketSize / groupCount)
  const remainingSlots = bracketSize - baseQualifiers * groupCount

  const qualifiers: QualifierEntry[] = []
  const wildcardCandidates: QualifierEntry[] = []

  for (let g = 0; g < groupCount; g += 1) {
    const standings = standingsByGroup.get(g) ?? []
    standings.forEach((row, idx) => {
      const rank = idx + 1
      const entry: QualifierEntry = {
        playerId: row.playerId,
        groupIndex: g,
        rankInGroup: rank,
        points: row.points,
        wins: row.wins,
        legsDiff: row.legsDiff,
        average: row.average
      }
      if (rank <= baseQualifiers) {
        qualifiers.push(entry)
      } else if (rank === baseQualifiers + 1) {
        wildcardCandidates.push(entry)
      }
    })
  }

  if (remainingSlots > 0 && wildcardCandidates.length > 0) {
    wildcardCandidates.sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.legsDiff - a.legsDiff ||
        b.average - a.average
    )
    qualifiers.push(...wildcardCandidates.slice(0, remainingSlots))
  }

  return qualifiers
}

const compareQualifierStrength = (a: QualifierEntry, b: QualifierEntry) =>
  a.rankInGroup - b.rankInGroup ||
  b.points - a.points ||
  b.wins - a.wins ||
  b.legsDiff - a.legsDiff ||
  b.average - a.average

const compareQualifierWeakness = (a: QualifierEntry, b: QualifierEntry) =>
  b.rankInGroup - a.rankInGroup ||
  a.points - b.points ||
  a.wins - b.wins ||
  a.legsDiff - b.legsDiff ||
  a.average - b.average

const nextPowerOfTwo = (value: number) => {
  let result = 1
  while (result < value) result *= 2
  return result
}

/**
 * Standard tennis-style bracket-seed slot order. seedSlots(16) returns
 * [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]; consecutive
 * pairs (#1 vs #16, #8 vs #9, ...) are R1 matches in the canonical
 * 16-bracket layout. The recursion guarantees seeds are spread so the
 * top seeds only ever meet in the latest possible round.
 */
export const seedSlots = (size: number): number[] => {
  if (size <= 1) return [1]
  const previous = seedSlots(size / 2)
  const top = size + 1
  const result: number[] = []
  previous.forEach((seed) => {
    result.push(seed)
    result.push(top - seed)
  })
  return result
}

const sortByPerformanceDesc = (a: QualifierEntry, b: QualifierEntry) =>
  b.points - a.points ||
  b.wins - a.wins ||
  b.legsDiff - a.legsDiff ||
  b.average - a.average

/**
 * Build the first round of a knockout bracket from the group-stage
 * qualifiers.
 *
 * Seeding rules (the user's preferred German-style championship layout):
 * 1. Group winners (rankInGroup === 1) take the lowest seed numbers,
 *    ordered by group performance (most points → wins → legs diff → avg).
 *    For 6 groups they occupy seeds 1-6.
 * 2. Group runners-up (rankInGroup === 2) take the next block, again
 *    ordered by performance. For 6 groups, seeds 7-12.
 * 3. Wildcards (rankInGroup ≥ 3, e.g. the best 4 third-placed players in
 *    a 6-group / Top 16 setup) take the remaining seeds, ordered by
 *    performance. For 6 groups + Top 16, seeds 13-16.
 *
 * R1 pairings follow the canonical 16-bracket layout (#1 vs #16, #8 vs
 * #9, #4 vs #13, ...).
 *
 * Anti-rematch pass: if a pair lands two players from the same group
 * (because two of them ended up in adjacent tiers of the same bracket
 * pair), we swap the lower-seeded player with the next available seed
 * that breaks the conflict without creating a new one.
 *
 * Returns:
 * - `pairs`: ordered [a, b] pairs ready to be inserted as R1 matches.
 *   `b === null` means a bye through to R2.
 * - `seedOrder`: the seeded slot order (top of bracket → bottom), which
 *   downstream UI uses to label placeholder slots.
 */
export const buildSeededKnockoutPairsAvoidingSameGroup = (
  qualifiers: QualifierEntry[]
): { pairs: Array<[string, string | null]>; seedOrder: Array<QualifierEntry | null> } => {
  if (qualifiers.length < 2) return { pairs: [], seedOrder: qualifiers }

  const bracketSize = nextPowerOfTwo(qualifiers.length)

  // 1. Group qualifiers into rank-tiers, sort each tier by performance.
  const tierMap = new Map<number, QualifierEntry[]>()
  qualifiers.forEach((entry) => {
    const tier = tierMap.get(entry.rankInGroup) ?? []
    tier.push(entry)
    tierMap.set(entry.rankInGroup, tier)
  })
  const tierKeysAsc = Array.from(tierMap.keys()).sort((a, b) => a - b)

  // 2. Flatten into a "seed list" — index 0 = seed #1, index 1 = seed
  //    #2, ... Top-tier players come first.
  const seedList: Array<QualifierEntry | null> = []
  tierKeysAsc.forEach((rank) => {
    const tier = tierMap.get(rank) ?? []
    tier.sort(sortByPerformanceDesc)
    seedList.push(...tier)
  })
  while (seedList.length < bracketSize) seedList.push(null)

  // 3. Standard bracket positions: which seed lives at which visual slot.
  const slotOrder = seedSlots(bracketSize) // 1-based seed numbers, top→bottom
  let visualSlots: Array<QualifierEntry | null> = slotOrder.map(
    (seedNumber) => seedList[seedNumber - 1] ?? null
  )

  // 4. Build R1 pairs from the visual slot order.
  const buildPairs = (slots: Array<QualifierEntry | null>) => {
    const result: Array<[QualifierEntry | null, QualifierEntry | null]> = []
    for (let i = 0; i < slots.length; i += 2) {
      result.push([slots[i], slots[i + 1] ?? null])
    }
    return result
  }

  // 5. Anti-rematch: walk through R1 pairs; for any same-group conflict,
  //    swap the lower-seeded (numerically larger seed) player with the
  //    nearest other slot whose swap fixes both pairs.
  const conflicting = ([a, b]: [QualifierEntry | null, QualifierEntry | null]) =>
    a !== null && b !== null && a.groupIndex === b.groupIndex

  // Map slot index → seed number, used to identify "lower-seeded" within
  // a conflicting pair. (The higher seed number is the lower seed rank.)
  const slotSeedNumber = (slotIndex: number) => slotOrder[slotIndex] ?? Number.MAX_SAFE_INTEGER

  const tryFixConflict = (pairIndex: number): boolean => {
    const slotA = pairIndex * 2
    const slotB = pairIndex * 2 + 1
    const playerA = visualSlots[slotA]
    const playerB = visualSlots[slotB]
    if (!playerA || !playerB) return true
    if (playerA.groupIndex !== playerB.groupIndex) return true

    // The "lower-seeded" of the two is the one whose seed NUMBER is larger.
    const swapSlot = slotSeedNumber(slotA) > slotSeedNumber(slotB) ? slotA : slotB
    const partnerSlot = swapSlot === slotA ? slotB : slotA
    const partnerPlayer = visualSlots[partnerSlot]
    if (!partnerPlayer) return true

    // Visit candidate slots in order of seed-number distance (closest
    // candidate first). For each, attempt the swap and check both pairs.
    const candidateSlots: number[] = []
    for (let i = 0; i < visualSlots.length; i += 1) {
      if (i === slotA || i === slotB) continue
      candidateSlots.push(i)
    }
    candidateSlots.sort(
      (i, j) =>
        Math.abs(slotSeedNumber(i) - slotSeedNumber(swapSlot)) -
        Math.abs(slotSeedNumber(j) - slotSeedNumber(swapSlot))
    )

    for (const candidate of candidateSlots) {
      const candidatePlayer = visualSlots[candidate]
      if (!candidatePlayer) continue
      // Identify the candidate's pair partner.
      const candidatePair = Math.floor(candidate / 2)
      const candidatePartnerSlot = candidate % 2 === 0 ? candidate + 1 : candidate - 1
      const candidatePartner = visualSlots[candidatePartnerSlot]
      // After swap: swapSlot will hold candidatePlayer; candidate slot
      // will hold the previously-conflicting player (i.e. the lower-
      // seeded one from pair `pairIndex`).
      const newPairA: [QualifierEntry | null, QualifierEntry | null] =
        swapSlot === slotA
          ? [candidatePlayer, playerB]
          : [playerA, candidatePlayer]
      const newPairCandidate: [QualifierEntry | null, QualifierEntry | null] =
        candidate % 2 === 0
          ? [visualSlots[swapSlot], candidatePartner]
          : [candidatePartner, visualSlots[swapSlot]]
      if (!conflicting(newPairA) && !conflicting(newPairCandidate)) {
        // Perform the swap.
        const tmp = visualSlots[swapSlot]
        visualSlots[swapSlot] = visualSlots[candidate]
        visualSlots[candidate] = tmp
        // Also need to re-check the candidate's pair if it's earlier in
        // the list (we may have created a new conflict elsewhere — but
        // the condition above already excludes that).
        void candidatePair
        return true
      }
    }
    return false // give up — leave the rematch
  }

  for (let i = 0; i < bracketSize / 2; i += 1) {
    tryFixConflict(i)
  }

  // 6. Convert to output format.
  const finalPairs = buildPairs(visualSlots)
  const pairs: Array<[string, string | null]> = finalPairs
    .map(([a, b]): [string, string | null] => [a?.playerId ?? '', b?.playerId ?? null])
    .filter(([a]) => a !== '')

  return { pairs, seedOrder: visualSlots }
}
