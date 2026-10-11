import type { DiffFile, DiffLine } from '../types'

export interface DiffRow {
  left?: DiffLine
  right?: DiffLine
}

export function sideBySide(lines: DiffLine[]): DiffRow[] {
  const rows: DiffRow[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.kind === 'ctx') {
      rows.push({ left: line, right: line })
      index += 1
      continue
    }
    const deletions: DiffLine[] = []
    const additions: DiffLine[] = []
    while (index < lines.length && lines[index].kind === 'del') deletions.push(lines[index++])
    while (index < lines.length && lines[index].kind === 'add') additions.push(lines[index++])
    const width = Math.max(deletions.length, additions.length)
    for (let row = 0; row < width; row += 1) {
      rows.push({ left: deletions[row], right: additions[row] })
    }
  }
  return rows
}

export function unifiedDiff(file: DiffFile): string {
  const oldStart = file.lines.find((line) => line.oldNo)?.oldNo ?? 1
  const newStart = file.lines.find((line) => line.newNo)?.newNo ?? 1
  const oldCount = file.lines.filter((line) => line.kind !== 'add').length
  const newCount = file.lines.filter((line) => line.kind !== 'del').length
  const body = file.lines
    .map((line) => {
      const mark = line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '
      return `${mark}${line.text}`
    })
    .join('\n')
  return [
    `diff --git a/${file.path} b/${file.path}`,
    `--- a/${file.path}`,
    `+++ b/${file.path}`,
    `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
    body,
    '',
  ].join('\n')
}

export function unifiedPatch(files: DiffFile[]): string {
  return files.map(unifiedDiff).join('\n')
}
