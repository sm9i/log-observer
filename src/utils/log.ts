import type { LogLevel } from '../types/log'

export function getLogLevel(text: string): LogLevel {
  if (/\b(error|fatal|exception|crash)\b/i.test(text)) return 'error'
  if (/\b(warn|warning)\b/i.test(text)) return 'warn'
  if (/\b(debug|verbose|trace)\b/i.test(text)) return 'debug'
  return 'info'
}

export function formatReceivedTime(date = new Date()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  }).format(date)
}
