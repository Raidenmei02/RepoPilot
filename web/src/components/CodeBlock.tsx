export function CodeBlock({
  content,
  startLine,
}: {
  content: string
  startLine: number
}) {
  const lines = content.replace(/\n$/, '').split('\n')
  return (
    <div className="codeblock">
      <pre>
        {lines.map((line, index) => (
          <div className="code-line" key={`${startLine + index}-${line}`}>
            <span className="ln">{startLine + index}</span>
            <span>{line || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  )
}
