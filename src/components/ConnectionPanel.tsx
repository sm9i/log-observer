import { CheckCircle2, CircleAlert, KeyRound, Link2, LoaderCircle, PlugZap, Unplug } from 'lucide-react'
import type { ConnectionStatus } from '../types/log'

type ConnectionPanelProps = {
  address: string
  connectedPort: number | null
  isActive: boolean
  socketKey: string
  onAddressChange: (value: string) => void
  onConnect: () => void
  onDisconnect: () => void
  onKeyChange: (value: string) => void
  status: ConnectionStatus
  statusMessage: string
}

export function ConnectionPanel({
  address,
  connectedPort,
  isActive,
  socketKey,
  onAddressChange,
  onConnect,
  onDisconnect,
  onKeyChange,
  status,
  statusMessage,
}: ConnectionPanelProps) {
  const handleKeyDown = (key: string) => {
    if (key === 'Enter' && !isActive) onConnect()
  }

  return (
    <section className="connection-panel" aria-label="Socket 连接设置">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">WEBSOCKET STREAM</p>
          <h1>实时日志</h1>
        </div>
        <div className={`connection-state ${status}`}>
          {status === 'connecting' ? <LoaderCircle size={16} className="spin" /> : status === 'connected' ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
          <span>{statusMessage}</span>
        </div>
      </div>

      <div className="connection-form">
        <label className="field address-field">
          <span>IP 地址</span>
          <div className="input-with-icon">
            <Link2 size={17} aria-hidden="true" />
            <input
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              onKeyDown={(event) => handleKeyDown(event.key)}
              placeholder="请输入 IP 地址"
              spellCheck="false"
              aria-label="IP 地址"
            />
          </div>
        </label>
        <label className="field port-field">
          <span>连接端口</span>
          <input
            value={connectedPort ?? ''}
            aria-label="自动探测端口"
            disabled
          />
        </label>
        <label className="field key-field">
          <span>Key</span>
          <div className="input-with-icon">
            <KeyRound size={17} aria-hidden="true" />
            <input
              value={socketKey}
              onChange={(event) => onKeyChange(event.target.value)}
              onKeyDown={(event) => handleKeyDown(event.key)}
              placeholder="请输入 Key"
              spellCheck="false"
              autoComplete="off"
              aria-label="Socket Key"
              disabled={isActive}
            />
          </div>
        </label>
        <button className="connect-button" type="button" onClick={isActive ? onDisconnect : onConnect}>
          {isActive ? <Unplug size={17} /> : <PlugZap size={17} />}
          {isActive ? '断开连接' : status === 'error' ? '重新连接' : '连接'}
        </button>
      </div>
    </section>
  )
}
