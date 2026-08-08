import { RotateCw, Trash2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LogEntry } from '../types/log'

type LogViewerProps = {
  logs: LogEntry[]
  onClear: () => void
}

const LOG_TOKEN_PATTERN = /(https?:\/\/[^\s<>"']+|wss?:\/\/[^\s<>"']+|<redacted-token>|\[SUCCESS\]|\[ERROR\])/g
const JSON_START_PATTERN = /[{[]/g

type JsonPayload = {
  start: number
  value: string
}

function findJsonPayload(text: string): JsonPayload | null {
  // Look for JSON that occupies the rest of a log line, so [DEBUG] prefixes remain valid.
  for (const match of text.matchAll(JSON_START_PATTERN)) {
    const candidate = text.slice(match.index).trim()
    try {
      const parsed = JSON.parse(candidate) as unknown
      if (typeof parsed === 'object' && parsed !== null) {
        return { start: match.index, value: candidate }
      }
    } catch {
      // This opening brace belongs to normal text; continue with the next one.
    }
  }
  return null
}

function HighlightedLogText({ text }: { text: string }) {
  return (
    <>
      {text.split(LOG_TOKEN_PATTERN).map((part, index) => {
        if (!part) return null
        if (part === '<redacted-token>') return <span className="redacted-token" key={index}>{part}</span>
        if (part === '[SUCCESS]') return <span className="success-token" key={index}>{part}</span>
        if (part === '[ERROR]') return <span className="error-token" key={index}>{part}</span>
        if (/^(https?|wss?):\/\//.test(part)) {
          return <a className="log-link" href={part} target="_blank" rel="noreferrer" key={index}>{part}</a>
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

export function LogViewer({ logs, onClear }: LogViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const followTailRef = useRef(true)
  const copyTimerRef = useRef<number | undefined>(undefined)
  const [copiedLogId, setCopiedLogId] = useState<number | null>(null)
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 23,
    overscan: 12,
  })

  useLayoutEffect(() => {
    if (logs.length && followTailRef.current) {
      virtualizer.scrollToIndex(logs.length - 1, { align: 'end' })
    }
  }, [logs.length, virtualizer])

  const handleScroll = () => {
    const viewport = viewportRef.current
    if (!viewport) return
    // Do not pull the viewport away while the user is reading or selecting old logs.
    followTailRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 32
  }

  const virtualItems = virtualizer.getVirtualItems()
  const copyJson = (json: string, logId: number) => {
    if (!navigator.clipboard) return

    void navigator.clipboard.writeText(json).then(() => {
      setCopiedLogId(logId)
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedLogId(null), 1_500)
    })
  }

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), [])

  return (
    <section className="log-panel" aria-label="接收的日志">
      <div className="log-toolbar">
        <div className="log-title">
          <span className="live-indicator" aria-hidden="true" />
          <strong>日志流</strong>
          <span className="log-count">{logs.length.toLocaleString()} 条</span>
        </div>
        <div className="toolbar-actions">
          <span className="newest-label"><RotateCw size={14} /> 最新在下</span>
          <button className="icon-button" type="button" onClick={onClear} disabled={!logs.length} aria-label="清空日志" title="清空日志">
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="terminal-viewport" onScroll={handleScroll} tabIndex={0} aria-label="实时日志终端输出">
        {logs.length ? (
          <div className="terminal-content" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualItems.map((virtualItem) => {
              const log = logs[virtualItem.index]
              const jsonPayload = findJsonPayload(log.text)
              return (
                <div
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="terminal-line"
                  key={log.id}
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  <span className="terminal-time">{log.receivedAt}</span>
                  <span className="terminal-separator"> </span>
                  {jsonPayload ? (
                    <>
                      <HighlightedLogText text={log.text.slice(0, jsonPayload.start)} />
                      <span
                        className="json-payload"
                        role="button"
                        tabIndex={0}
                        title="点击复制 JSON"
                        onClick={() => copyJson(jsonPayload.value, log.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') copyJson(jsonPayload.value, log.id)
                        }}
                      >
                        {jsonPayload.value}
                      </span>
                    </>
                  ) : <HighlightedLogText text={log.text} />}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="terminal-placeholder">等待日志流...</div>
        )}
      </div>
      {copiedLogId !== null && <div className="copy-toast" role="status">JSON 已复制</div>}
    </section>
  )
}
