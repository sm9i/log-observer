import { ConnectionPanel } from '../components/ConnectionPanel'
import { LogViewer } from '../components/LogViewer'
import { useSocketLogs } from '../hooks/useSocketLogs'

export function LogObserverPage() {
  const socketLogs = useSocketLogs()

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="WebSocket 日志观察器">
        <ConnectionPanel
          address={socketLogs.address}
          connectedPort={socketLogs.connectedPort}
          isActive={socketLogs.isActive}
          socketKey={socketLogs.key}
          onAddressChange={socketLogs.setAddress}
          onConnect={socketLogs.connect}
          onDisconnect={socketLogs.disconnect}
          onKeyChange={socketLogs.setKey}
          status={socketLogs.status}
          statusMessage={socketLogs.statusMessage}
        />
        <LogViewer logs={socketLogs.logs} onClear={() => socketLogs.setLogs([])} />
      </section>
    </main>
  )
}
