import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnectionStatus, ConnectionStatusContent, LogEntry } from '../types/log'
import { formatReceivedTime, getLogLevel } from '../utils/log'
import { buildSocketUrl } from '../utils/socket'

const MAX_LOGS = 1_000
const SOCKET_PORTS = [45679, 45683, 45691, 45707, 45713]
const CONNECTION_TIMEOUT_MS = 3_000

export const statusContent: Record<ConnectionStatus, ConnectionStatusContent> = {
  idle: { label: '尚未连接', detail: '输入服务地址后开始监听' },
  connecting: { label: '正在连接', detail: '正在与日志服务建立连接' },
  connected: { label: '连接正常', detail: '实时接收日志中' },
  error: { label: '连接失败', detail: '请检查服务地址、端口和网络' },
  disconnected: { label: '连接已断开', detail: '日志服务已关闭连接' },
}

export function useSocketLogs() {
  const socketRef = useRef<WebSocket | null>(null)
  const logIdRef = useRef(0)
  const probeIdRef = useRef(0)
  const [address, setAddress] = useState('')
  const [key, setKey] = useState('')
  const [connectedPort, setConnectedPort] = useState<number | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [statusMessage, setStatusMessage] = useState(statusContent.idle.detail)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const appendLog = useCallback((payload: string) => {
    const entry: LogEntry = {
      id: ++logIdRef.current,
      receivedAt: formatReceivedTime(),
      text: payload,
      level: getLogLevel(payload),
    }

    // Append at the bottom so the terminal follows the same direction as logcat.
    setLogs((currentLogs) => [...currentLogs, entry].slice(-MAX_LOGS))
  }, [])

  const disconnect = useCallback((showDisconnectedStatus = true) => {
    probeIdRef.current += 1
    const socket = socketRef.current
    socketRef.current = null

    if (socket) {
      // Detach handlers first, so closing a replaced socket cannot overwrite new state.
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null

      if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
        socket.close(1000)
      }
    }

    if (showDisconnectedStatus) {
      setConnectedPort(null)
      setStatus('disconnected')
      setStatusMessage(statusContent.disconnected.detail)
    }
  }, [])

  const connect = useCallback(() => {
    disconnect(false)
    setStatus('connecting')
    setConnectedPort(null)

    // A monotonically increasing id makes callbacks from an older probe harmless.
    const probeId = probeIdRef.current
    const tryPort = (portIndex: number) => {
      if (probeIdRef.current !== probeId) return
      if (portIndex >= SOCKET_PORTS.length) {
        setStatus('error')
        setStatusMessage('未能连接到可用日志端口')
        return
      }

      const port = SOCKET_PORTS[portIndex]
      let url: string
      try {
        url = buildSocketUrl(address, String(port), key)
      } catch (error) {
        setStatus('error')
        setStatusMessage(error instanceof Error ? error.message : '地址格式不正确')
        return
      }

      setStatusMessage(`正在尝试端口 ${port}（${portIndex + 1}/${SOCKET_PORTS.length}）`)

      try {
        const socket = new WebSocket(url)
        socketRef.current = socket
        let hasConnected = false
        const timeoutId = window.setTimeout(() => socket.close(), CONNECTION_TIMEOUT_MS)

        socket.onopen = () => {
          window.clearTimeout(timeoutId)
          if (socketRef.current !== socket || probeIdRef.current !== probeId) return
          hasConnected = true
          setConnectedPort(port)
          setStatus('connected')
          setStatusMessage(`已连接 ${address}:${port}`)
        }

        socket.onmessage = (event) => {
          if (typeof event.data === 'string') {
            appendLog(event.data)
          } else if (event.data instanceof Blob) {
            void event.data.text().then((text) => {
              if (socketRef.current === socket) appendLog(text)
            })
          } else {
            appendLog(String(event.data))
          }
        }

        socket.onclose = () => {
          window.clearTimeout(timeoutId)
          if (socketRef.current !== socket || probeIdRef.current !== probeId) return
          socketRef.current = null

          if (hasConnected) {
            setConnectedPort(null)
            setStatus('disconnected')
            setStatusMessage(statusContent.disconnected.detail)
          } else {
            // Move on after a refused connection or a timeout, in the declared order.
            tryPort(portIndex + 1)
          }
        }
      } catch {
        tryPort(portIndex + 1)
      }
    }

    tryPort(0)
  }, [address, appendLog, disconnect, key])

  // A route change or app unmount must not leave an active socket behind.
  useEffect(() => () => disconnect(false), [disconnect])

  return {
    address,
    connect,
    disconnect,
    isActive: status === 'connected' || status === 'connecting',
    connectedPort,
    key,
    logs,
    setAddress,
    setKey,
    setLogs,
    status,
    statusMessage,
  }
}
