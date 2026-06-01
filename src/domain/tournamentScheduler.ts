export interface RoundRobinRound {
  round: number
  pairs: Array<[string, string]>
}

export const generateRoundRobinRounds = (playerIds: string[]): RoundRobinRound[] => {
  const players = [...playerIds]
  const isOdd = players.length % 2 === 1
  if (isOdd) players.push('BYE')
  const totalPlayers = players.length
  const rounds = totalPlayers - 1
  const half = totalPlayers / 2
  const schedule: RoundRobinRound[] = []

  let rotation = [...players]
  for (let round = 0; round < rounds; round += 1) {
    const pairs: Array<[string, string]> = []
    for (let i = 0; i < half; i += 1) {
      const home = rotation[i]
      const away = rotation[totalPlayers - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        pairs.push([home, away])
      }
    }
    schedule.push({ round: round + 1, pairs })
    const fixed = rotation[0]
    const rest = rotation.slice(1)
    rest.unshift(rest.pop() as string)
    rotation = [fixed, ...rest]
  }
  return schedule
}

export const distributePlayersToGroups = (playerIds: string[], groupCount: number) => {
  const normalizedGroupCount = Math.max(1, Math.floor(groupCount))
  const groups: string[][] = Array.from({ length: normalizedGroupCount }, () => [])
  playerIds.forEach((playerId, index) => {
    groups[index % normalizedGroupCount].push(playerId)
  })
  return groups
}

const isValidGroupIndex = (value: number | undefined, groupCount: number): value is number =>
  Number.isInteger(value) && value >= 0 && value < groupCount

const smallestGroupIndex = (groups: string[][]) =>
  groups.reduce((smallestIndex, group, index) => (
    group.length < groups[smallestIndex].length ? index : smallestIndex
  ), 0)

export const buildGroupsFromAssignments = (
  playerIds: string[],
  groupCount: number,
  assignments: Map<string, number | undefined> = new Map()
) => {
  const normalizedGroupCount = Math.max(1, Math.floor(groupCount))
  const groups: string[][] = Array.from({ length: normalizedGroupCount }, () => [])
  const unassigned: string[] = []

  playerIds.forEach((playerId) => {
    const groupIndex = assignments.get(playerId)
    if (isValidGroupIndex(groupIndex, normalizedGroupCount)) {
      groups[groupIndex].push(playerId)
      return
    }
    unassigned.push(playerId)
  })

  unassigned.forEach((playerId) => {
    groups[smallestGroupIndex(groups)].push(playerId)
  })

  return groups
}

const nextPowerOfTwo = (value: number) => {
  let result = 1
  while (result < value) result *= 2
  return result
}

const seedPairs = (seeds: Array<string | null>) => {
  const pairs: Array<[string, string | null]> = []
  const total = seeds.length
  for (let i = 0; i < total / 2; i += 1) {
    pairs.push([seeds[i] as string, seeds[total - 1 - i]])
  }
  return pairs
}

export const buildKnockoutSeedPairs = (seededPlayers: string[]) => {
  const bracketSize = nextPowerOfTwo(seededPlayers.length)
  const seeds: Array<string | null> = [...seededPlayers]
  while (seeds.length < bracketSize) {
    seeds.push(null)
  }
  return seedPairs(seeds)
}
