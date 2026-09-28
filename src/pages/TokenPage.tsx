import { TokenLoginPanel } from '../components/TokenLoginPanel'

export function TokenPage() {
  return (
    <main className="app-shell">
      <section className="workspace token-workspace" aria-label="Token 调试工具">
        <TokenLoginPanel />
        <section className="reserved-panel" aria-label="预留功能">
          <span className="reserved-dot" aria-hidden="true" />
          <div><strong>更多调试功能</strong><p>功能区域已预留，后续可继续扩展。</p></div>
        </section>
      </section>
    </main>
  )
}
