type Dart = {
  label: string
  score: number
  isDouble: boolean
}

type Combo = {
  darts: Dart[]
  rating: number
}

const buildDarts = (): { all: Dart[]; finishers: Dart[] } => {
  const singles: Dart[] = Array.from({ length: 20 }, (_, i) => ({
    label: String(i + 1),
    score: i + 1,
    isDouble: false
  }))
  const doubles: Dart[] = Array.from({ length: 20 }, (_, i) => ({
    label: `D${i + 1}`,
    score: (i + 1) * 2,
    isDouble: true
  }))
  const triples: Dart[] = Array.from({ length: 20 }, (_, i) => ({
    label: `T${i + 1}`,
    score: (i + 1) * 3,
    isDouble: false
  }))
  const sbull: Dart = { label: 'SBull', score: 25, isDouble: false }
  const bull: Dart = { label: 'Bull', score: 50, isDouble: true }

  const all = [...triples, ...doubles, ...singles, sbull, bull]
  const finishers = [...doubles, bull]

  return { all, finishers }
}

const finishPreference = new Map<string, number>([
  ['Bull', 120],
  ['D20', 115],
  ['D16', 110],
  ['D18', 108],
  ['D12', 106],
  ['D10', 104],
  ['D8', 102],
  ['D6', 100],
  ['D4', 98],
  ['D2', 96],
  ['D14', 94],
  ['D15', 92],
  ['D17', 90],
  ['D19', 88],
  ['D13', 86],
  ['D11', 84],
  ['D9', 82],
  ['D7', 80],
  ['D5', 78],
  ['D3', 76],
  ['D1', 74]
])

const rateCombo = (combo: Dart[]): number => {
  const dartsCount = combo.length
  const triples = combo.filter((dart) => dart.label.startsWith('T')).length
  const finish = combo[combo.length - 1]
  const finishScore = finishPreference.get(finish.label) ?? 0
  const weightedScore = combo.reduce((total, dart, index) => {
    const weight = index === 0 ? 2 : 1
    return total + dart.score * weight
  }, 0)

  return (3 - dartsCount) * 10000 + triples * 180 + finishScore * 5 + weightedScore
}

const buildCheckoutTable = (): Record<number, string[]> => {
  const { all, finishers } = buildDarts()
  const table: Record<number, string[]> = {}

  for (let target = 2; target <= 170; target += 1) {
    const combos: Combo[] = []

    for (const finisher of finishers) {
      if (finisher.score === target) {
        combos.push({ darts: [finisher], rating: rateCombo([finisher]) })
      }
    }

    for (const first of all) {
      for (const finisher of finishers) {
        if (first.score + finisher.score === target) {
          combos.push({ darts: [first, finisher], rating: rateCombo([first, finisher]) })
        }
      }
    }

    for (const first of all) {
      for (const second of all) {
        for (const finisher of finishers) {
          if (first.score + second.score + finisher.score === target) {
            combos.push({ darts: [first, second, finisher], rating: rateCombo([first, second, finisher]) })
          }
        }
      }
    }

    combos.sort((a, b) => b.rating - a.rating)

    if (combos.length > 0) {
      table[target] = combos[0].darts.map((dart) => dart.label)
    }
  }

  return table
}

const checkoutTable = buildCheckoutTable()

export const getCheckoutSuggestion = (score: number): string[] | null => {
  if (score < 2 || score > 170) return null
  return checkoutTable[score] ?? null
}
