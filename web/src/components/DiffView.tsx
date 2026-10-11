import { useRef } from 'react'
import { sideBySide } from '../lib/diff'
import type { DiffFile, DiffLine } from '../types'

function Line({ line, side }: { line?: DiffLine; side: 'old' | 'new' }) {
  if (!line || (side === 'old' && line.kind === 'add') || (side === 'new' && line.kind === 'del')) {
    return <div className="diff-line empty" />
  }
  const number = side === 'old' ? line.oldNo : line.newNo
  const mark = line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '
  return (
    <div className={`diff-line ${line.kind}`}>
      <span className="ln">{number ?? ''}</span>
      <span className="mark">{mark}</span>
      <span className="txt">{line.text || ' '}</span>
    </div>
  )
}

export function DiffView({ file }: { file: DiffFile }) {
  const rows = sideBySide(file.lines)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const lock = useRef(false)

  function sync(from: 'left' | 'right') {
    if (lock.current) return
    const source = from === 'left' ? leftRef.current : rightRef.current
    const target = from === 'left' ? rightRef.current : leftRef.current
    if (!source || !target) return
    lock.current = true
    target.scrollTop = source.scrollTop
    target.scrollLeft = source.scrollLeft
    lock.current = false
  }

  return (
    <div className="diff-split">
      <section>
        <header>原始文件</header>
        <div className="diff-scroll" ref={leftRef} onScroll={() => sync('left')}>
          {rows.map((row, index) => (
            <Line key={`l-${index}`} line={row.left} side="old" />
          ))}
        </div>
      </section>
      <section>
        <header>候选修改</header>
        <div className="diff-scroll" ref={rightRef} onScroll={() => sync('right')}>
          {rows.map((row, index) => (
            <Line key={`r-${index}`} line={row.right} side="new" />
          ))}
        </div>
      </section>
    </div>
  )
}
