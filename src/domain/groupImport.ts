export interface GroupedPlayerImport {
  names: string[]
  assignments: Array<{ name: string; groupIndex: number }>
  requiredGroupCount: number
}

export const normalizeImportedName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')

export const groupLabelToIndex = (label: string) => {
  const normalized = label
    .trim()
    .toUpperCase()
    .replace(/^(GRUPPE|GROUP|GR)\.?\s+/, '')
    .replace(/^GRUPPE\s*/, '')
    .trim()
  if (!/^[A-Z]{1,2}$/.test(normalized)) return undefined
  return normalized.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1
}

export const groupIndexToLabel = (index: number) => {
  let label = ''
  let value = index
  do {
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26) - 1
  } while (value >= 0)
  return label
}

export const splitImportLine = (line: string) => {
  if (line.includes('\t')) return line.split('\t')
  return line.replace(':', ';').split(/[;,]/)
}

export const parseGroupedPlayerImport = (
  input: string,
  options: { maxGroupCount: number; initialGroupCount: number }
): GroupedPlayerImport => {
  const names: string[] = []
  const assignments: Array<{ name: string; groupIndex: number }> = []
  const seenNames = new Set<string>()
  let requiredGroupCount = options.initialGroupCount

  const addName = (name: string, groupIndex?: number) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const normalized = normalizeImportedName(trimmed)
    if (!seenNames.has(normalized)) {
      names.push(trimmed)
      seenNames.add(normalized)
    }
    if (groupIndex !== undefined) {
      assignments.push({ name: trimmed, groupIndex })
    }
  }

  input.split(/\r?\n/).forEach((rawLine) => {
    const cells = splitImportLine(rawLine).map((value) => value.trim()).filter(Boolean)
    if (cells.length === 0) return

    // Excel exports sometimes include leading helper columns. Use the first clear
    // group label in the first few cells, then treat all following cells as names.
    const groupCellIndex = cells.findIndex((cell, index) => index <= 2 && groupLabelToIndex(cell) !== undefined)
    if (groupCellIndex >= 0) {
      const groupIndex = groupLabelToIndex(cells[groupCellIndex])
      if (groupIndex !== undefined && groupIndex >= 0 && groupIndex < options.maxGroupCount) {
        requiredGroupCount = Math.max(requiredGroupCount, groupIndex + 1)
        cells.slice(groupCellIndex + 1).forEach((name) => addName(name, groupIndex))
        return
      }
    }

    cells.forEach((name) => addName(name))
  })

  return { names, assignments, requiredGroupCount }
}
