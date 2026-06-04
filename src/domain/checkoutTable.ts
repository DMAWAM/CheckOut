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

// Reward big "predictable" non-finisher segments and penalise tiny
// triples / awkward singles. The numbers don't matter as such — only
// the ordering does. They are layered on top of finishPreference for
// the final dart and the (3 - dartCount) bias for shorter paths, so
// the algorithmic fallback below produces sensible suggestions for
// any target that isn't covered by the hardcoded PDC table.
const segmentPreference = (dart: Dart): number => {
  if (dart.label === 'Bull') return 60
  if (dart.label === 'SBull') return 20
  if (dart.label.startsWith('T')) {
    const num = Number(dart.label.slice(1))
    if (num === 20) return 100
    if (num === 19) return 80
    if (num === 18) return 70
    if (num === 17) return 65
    if (num >= 14) return 55
    if (num >= 10) return 40
    return 10 // T1-T9: pros avoid these tiny segments
  }
  if (dart.label.startsWith('D')) {
    return (finishPreference.get(dart.label) ?? 70) - 20
  }
  // Singles: bigger number = larger "20" sector = preferred filler
  const num = Number(dart.label)
  if (!Number.isFinite(num)) return 30
  if (num === 20) return 95
  if (num === 19) return 85
  if (num === 18) return 75
  if (num === 17) return 68
  if (num === 16) return 62
  if (num === 15) return 58
  if (num >= 10) return 50
  return 35
}

const rateCombo = (combo: Dart[]): number => {
  const dartsCount = combo.length
  const finish = combo[combo.length - 1]
  const finishScore = finishPreference.get(finish.label) ?? 0
  // Sum the segment preferences for the non-finisher darts. Encourages
  // the algorithm to land on the fat 20 / 19 / 18 sectors instead of
  // landing on a T5-style tiny triple.
  const segmentScore = combo.slice(0, -1).reduce((total, dart) => total + segmentPreference(dart), 0)

  return (3 - dartsCount) * 100000 + finishScore * 100 + segmentScore
}

const buildAlgorithmicTable = (): Record<number, string[]> => {
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

// Hardcoded PDC-style checkout paths for every realistic out-shot from
// 2-170. These are the paths professional players actually throw, e.g.
// "S15 -> D20" for 55 (instead of the algorithmic T5+D20, which is a
// tiny segment no pro would aim at). For each target we keep only one
// canonical path; the algorithmic fallback handles anything missing.
const standardCheckouts: Record<number, string[]> = {
  170: ['T20', 'T20', 'Bull'],
  167: ['T20', 'T19', 'Bull'],
  164: ['T20', 'T18', 'Bull'],
  161: ['T20', 'T17', 'Bull'],
  160: ['T20', 'T20', 'D20'],
  158: ['T20', 'T20', 'D19'],
  157: ['T20', 'T19', 'D20'],
  156: ['T20', 'T20', 'D18'],
  155: ['T20', 'T19', 'D19'],
  154: ['T20', 'T18', 'D20'],
  153: ['T20', 'T19', 'D18'],
  152: ['T20', 'T20', 'D16'],
  151: ['T20', 'T17', 'D20'],
  150: ['T20', 'T18', 'D18'],
  149: ['T20', 'T19', 'D16'],
  148: ['T20', 'T20', 'D14'],
  147: ['T20', 'T17', 'D18'],
  146: ['T20', 'T18', 'D16'],
  145: ['T20', 'T19', 'D14'],
  144: ['T20', 'T20', 'D12'],
  143: ['T20', 'T17', 'D16'],
  142: ['T20', 'T14', 'D20'],
  141: ['T20', 'T19', 'D12'],
  140: ['T20', 'T20', 'D10'],
  139: ['T19', 'T14', 'D20'],
  138: ['T20', 'T18', 'D12'],
  137: ['T20', 'T19', 'D10'],
  136: ['T20', 'T20', 'D8'],
  135: ['T20', 'T15', 'D15'],
  134: ['T20', 'T14', 'D16'],
  133: ['T20', 'T19', 'D8'],
  132: ['T20', 'T16', 'D12'],
  131: ['T20', 'T13', 'D16'],
  130: ['T20', 'T20', 'D5'],
  129: ['T19', 'T16', 'D12'],
  128: ['T20', 'T20', 'D4'],
  127: ['T20', 'T17', 'D8'],
  126: ['T19', 'T19', 'D6'],
  125: ['T20', 'T19', 'D4'],
  124: ['T20', 'T16', 'D8'],
  123: ['T19', 'T16', 'D9'],
  122: ['T18', 'T18', 'D7'],
  121: ['T20', 'T11', 'D14'],
  120: ['T20', '20', 'D20'],
  119: ['T19', 'T12', 'D13'],
  118: ['T20', '18', 'D20'],
  117: ['T20', '17', 'D20'],
  116: ['T20', '16', 'D20'],
  115: ['T20', '15', 'D20'],
  114: ['T20', '14', 'D20'],
  113: ['T20', '13', 'D20'],
  112: ['T20', '12', 'D20'],
  111: ['T20', '11', 'D20'],
  110: ['T20', '10', 'D20'],
  109: ['T20', '9', 'D20'],
  108: ['T20', '16', 'D16'],
  107: ['T19', '10', 'D20'],
  106: ['T20', '6', 'D20'],
  105: ['T20', '13', 'D16'],
  104: ['T18', '18', 'D16'],
  103: ['T19', '16', 'D14'],
  102: ['T20', '10', 'D16'],
  101: ['T17', '10', 'D20'],
  100: ['T20', 'D20'],
  99: ['T19', '10', 'D16'],
  98: ['T20', 'D19'],
  97: ['T19', 'D20'],
  96: ['T20', 'D18'],
  95: ['T19', 'D19'],
  94: ['T18', 'D20'],
  93: ['T19', 'D18'],
  92: ['T20', 'D16'],
  91: ['T17', 'D20'],
  90: ['T18', 'D18'],
  89: ['T19', 'D16'],
  88: ['T20', 'D14'],
  87: ['T17', 'D18'],
  86: ['T18', 'D16'],
  85: ['T15', 'D20'],
  84: ['T20', 'D12'],
  83: ['T17', 'D16'],
  82: ['T14', 'D20'],
  81: ['T19', 'D12'],
  80: ['T20', 'D10'],
  79: ['T19', 'D11'],
  78: ['T18', 'D12'],
  77: ['T19', 'D10'],
  76: ['T20', 'D8'],
  75: ['T17', 'D12'],
  74: ['T14', 'D16'],
  73: ['T19', 'D8'],
  72: ['T16', 'D12'],
  71: ['T13', 'D16'],
  70: ['T18', 'D8'],
  69: ['T19', 'D6'],
  68: ['T20', 'D4'],
  67: ['T17', 'D8'],
  66: ['T10', 'D18'],
  65: ['T19', 'D4'],
  64: ['T16', 'D8'],
  63: ['T13', 'D12'],
  62: ['T10', 'D16'],
  61: ['T15', 'D8'],
  60: ['20', 'D20'],
  59: ['19', 'D20'],
  58: ['18', 'D20'],
  57: ['17', 'D20'],
  56: ['16', 'D20'],
  55: ['15', 'D20'],
  54: ['14', 'D20'],
  53: ['13', 'D20'],
  52: ['12', 'D20'],
  51: ['11', 'D20'],
  50: ['Bull'],
  49: ['9', 'D20'],
  48: ['16', 'D16'],
  47: ['15', 'D16'],
  46: ['6', 'D20'],
  45: ['13', 'D16'],
  44: ['12', 'D16'],
  43: ['3', 'D20'],
  42: ['10', 'D16'],
  41: ['9', 'D16'],
  40: ['D20'],
  39: ['7', 'D16'],
  38: ['D19'],
  37: ['5', 'D16'],
  36: ['D18'],
  35: ['3', 'D16'],
  34: ['D17'],
  33: ['1', 'D16'],
  32: ['D16'],
  31: ['15', 'D8'],
  30: ['D15'],
  29: ['13', 'D8'],
  28: ['D14'],
  27: ['11', 'D8'],
  26: ['D13'],
  25: ['9', 'D8'],
  24: ['D12'],
  23: ['7', 'D8'],
  22: ['D11'],
  21: ['5', 'D8'],
  20: ['D10'],
  19: ['3', 'D8'],
  18: ['D9'],
  17: ['1', 'D8'],
  16: ['D8'],
  15: ['7', 'D4'],
  14: ['D7'],
  13: ['5', 'D4'],
  12: ['D6'],
  11: ['3', 'D4'],
  10: ['D5'],
  9: ['1', 'D4'],
  8: ['D4'],
  7: ['3', 'D2'],
  6: ['D3'],
  5: ['1', 'D2'],
  4: ['D2'],
  3: ['1', 'D1'],
  2: ['D1']
}

const algorithmicTable = buildAlgorithmicTable()

export const getCheckoutSuggestion = (score: number): string[] | null => {
  if (score < 2 || score > 170) return null
  return standardCheckouts[score] ?? algorithmicTable[score] ?? null
}
