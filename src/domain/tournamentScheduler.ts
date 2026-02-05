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
  const groups: string[][] = Array.from({ length: groupCount }, () => [])
  playerIds.forEach((playerId, index) => {
    groups[index % groupCount].push(playerId)
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
