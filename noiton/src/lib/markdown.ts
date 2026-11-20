const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const FENCE_RE = /^\s*```([\w+-]*)\s*$/
const FENCE_END_RE = /^\s*```\s*$/

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

function safeUrl(url: string): string | null {
  const value = url.trim()
  if (/^(javascript|data|vbscript|file):/i.test(value)) return null
  return value
}

function inline(text: string): string {
  const codes: string[] = []
  let result = escapeHtml(text).replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const token = `\u0000c${codes.length}\u0000`
    codes.push(`<code>${code}</code>`)
    return token
  })

  result = result.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
    const href = safeUrl(url)
    return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>` : match
  })

  result = result.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/(^|[^\w*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  result = result.replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
  result = result.replace(/(^|[^\w_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>')
  result = result.replace(/~~([^~\n]+)~~/g, '<del>$1</del>')

  return result.replace(/\u0000c(\d+)\u0000/g, (_match, index: string) => codes[Number(index)] ?? '')
}

interface ListItem {
  ordered: boolean
  task: boolean
  done: boolean
  text: string
  children: ListItem[]
}

function parseList(lines: string[], start: number, indent: number): { items: ListItem[]; next: number } {
  const items: ListItem[] = []
  let i = start

  while (i < lines.length) {
    const match = LIST_RE.exec(lines[i] ?? '')
    if (!match || match[1].length !== indent) break

    const taskMatch = /^\[([ xX])\]\s+(.*)$/.exec(match[3])
    const item: ListItem = {
      ordered: /^\d/.test(match[2]),
      task: taskMatch !== null,
      done: taskMatch ? taskMatch[1].toLowerCase() === 'x' : false,
      text: taskMatch ? taskMatch[2] : match[3],
      children: [],
    }
    i++

    while (i < lines.length && lines[i].trim() && !LIST_RE.test(lines[i]) && /^\s/.test(lines[i])) {
      item.text += ' ' + lines[i].trim()
      i++
    }

    let nestedIndex = i
    if ((lines[nestedIndex] ?? '').trim() === '' && nestedIndex + 1 < lines.length) nestedIndex++
    const nested = LIST_RE.exec(lines[nestedIndex] ?? '')
    if (nested && nested[1].length > indent) {
      const child = parseList(lines, nestedIndex, nested[1].length)
      item.children = child.items
      i = child.next
    }

    items.push(item)
  }

  return { items, next: i }
}

function renderListItems(items: ListItem[]): string {
  if (!items.length) return ''
  const tag = items[0].ordered ? 'ol' : 'ul'
  const body = items.map((item) => {
    const checkbox = item.task ? `<input type="checkbox" disabled${item.done ? ' checked' : ''} />` : ''
    return `<li${item.task ? ' class="md-task"' : ''}>${checkbox}<span>${inline(item.text)}</span>${renderListItems(item.children)}</li>`
  })
  return `<${tag}>${body.join('')}</${tag}>`
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s|:\-]+\|?\s*$/.test(line) && line.includes('-')
}

function renderLines(lines: string[], codeBlocks: string[]): string {
  const output: string[] = []
  let i = 0

  const startsBlock = (line: string): boolean =>
    FENCE_RE.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
    LIST_RE.test(line) ||
    /^\s*\|.*\|\s*$/.test(line)

  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (!line.trim()) {
      i++
      continue
    }

    const fence = FENCE_RE.exec(line)
    if (fence) {
      const language = fence[1]
      const body: string[] = []
      i++
      while (i < lines.length && !FENCE_END_RE.test(lines[i] ?? '')) body.push(lines[i++])
      if (i < lines.length) i++
      const token = `\u0000b${codeBlocks.length}\u0000`
      codeBlocks.push(`<pre><code${language ? ` class="language-${language}"` : ''}>${escapeHtml(body.join('\n'))}</code></pre>`)
      output.push(token)
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      output.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      i++
      continue
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      output.push('<hr />')
      i++
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i] ?? '')) {
        quoted.push((lines[i] ?? '').replace(/^\s*>\s?/, ''))
        i++
      }
      output.push(`<blockquote>${renderLines(quoted, codeBlocks)}</blockquote>`)
      continue
    }

    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1] ?? '')) {
      const header = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i] ?? '')) rows.push(splitRow(lines[i++]))
      const head = header.map((cell) => `<th>${inline(cell)}</th>`).join('')
      const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')
      output.push(`<div class="md-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`)
      continue
    }

    const listStart = LIST_RE.exec(line)
    if (listStart) {
      const list = parseList(lines, i, listStart[1].length)
      output.push(renderListItems(list.items))
      i = list.next
      continue
    }

    const paragraph: string[] = []
    while (i < lines.length && (lines[i] ?? '').trim() && !startsBlock(lines[i] ?? '')) {
      paragraph.push((lines[i] ?? '').trim())
      i++
    }
    if (paragraph.length) output.push(`<p>${paragraph.map(inline).join('<br />')}</p>`)
    else i++
  }

  return output.join('\n')
}

export function renderMarkdown(source: string): string {
  const codeBlocks: string[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const html = renderLines(lines, codeBlocks)
  return html.replace(/\u0000b(\d+)\u0000/g, (_match, index: string) => codeBlocks[Number(index)] ?? '')
}
