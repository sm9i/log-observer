export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export type LogEntry = {
  id: number
  receivedAt: string
  text: string
  level: LogLevel
}

export type ConnectionStatusContent = {
  label: string
  detail: string
}
