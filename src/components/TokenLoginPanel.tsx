import { Check, ChevronDown, CircleAlert, CircleCheck, Clipboard, Globe2, KeyRound, LoaderCircle, LockKeyhole, LogIn, Plus, Save, Server, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type TokenResponse = {
  code?: number
  message?: string
  data?: { sessionId?: string }
}

type SavedEnvironment = {
  domain: string
  path: string
}

type Account = {
  id: string
  name: string
  userName: string
  password: string
  terminalType: string
}

type LegacySavedLogin = Omit<Account, 'id' | 'name'> & {
  domain?: string
  path?: string
  environment?: string
}

const SAVED_ENVIRONMENTS_KEY = 'log-observer.saved-environments'
const LAST_ENVIRONMENT_KEY = 'log-observer.last-environment'
const ACCOUNTS_KEY = 'log-observer.accounts'
const LEGACY_LOGINS_KEY = 'log-observer.saved-logins'

function createAccount(): Account {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: '',
    userName: '',
    password: '',
    terminalType: 'APP',
  }
}

function readJsonObject<T>(key: string): Record<string, T> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '') as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, T> : {}
  } catch {
    return {}
  }
}

function readSavedEnvironments() {
  return Object.entries(readJsonObject<unknown>(SAVED_ENVIRONMENTS_KEY)).reduce<Record<string, SavedEnvironment>>((result, [name, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result
    const candidate = value as Partial<SavedEnvironment>
    if (typeof candidate.domain !== 'string' || typeof candidate.path !== 'string') return result
    result[name] = { domain: candidate.domain, path: candidate.path }
    return result
  }, {})
}

function readAccounts(): Account[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '') as unknown
    if (Array.isArray(parsed) && parsed.length) {
      const validAccounts = parsed.flatMap((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return []
        const account = item as Partial<Account>
        return [{
          id: typeof account.id === 'string' && account.id ? account.id : `saved-${index}-${Date.now()}`,
          name: typeof account.name === 'string' ? account.name : '',
          userName: typeof account.userName === 'string' ? account.userName : '',
          password: typeof account.password === 'string' ? account.password : '',
          terminalType: typeof account.terminalType === 'string' && account.terminalType ? account.terminalType : 'APP',
        }]
      })
      if (validAccounts.length) return validAccounts
    }
  } catch {
    // Fall through to legacy migration.
  }

  const legacyAccounts = Object.values(readJsonObject<unknown>(LEGACY_LOGINS_KEY)).filter(
    (account): account is LegacySavedLogin => Boolean(account) && typeof account === 'object' && !Array.isArray(account),
  )
  if (legacyAccounts.length) {
    return legacyAccounts.map((account, index) => ({
      id: `legacy-${index}-${Date.now()}`,
      name: '',
      userName: typeof account.userName === 'string' ? account.userName : '',
      password: typeof account.password === 'string' ? account.password : '',
      terminalType: typeof account.terminalType === 'string' && account.terminalType ? account.terminalType : 'APP',
    }))
  }
  return [createAccount()]
}

function buildLoginUrl(domain: string, path: string) {
  const rawDomain = domain.trim().replace(/\/$/, '')
  const rawPath = path.trim()
  if (!rawDomain) throw new Error('请输入接口域名')
  if (!rawPath) throw new Error('请输入登录接口')
  const base = /^https?:\/\//i.test(rawDomain) ? rawDomain : `https://${rawDomain}`
  return new URL(rawPath.startsWith('/') ? `${base}${rawPath}` : `${base}/${rawPath}`).toString()
}

export function TokenLoginPanel() {
  const [environment, setEnvironment] = useState('')
  const [savedEnvironments, setSavedEnvironments] = useState<Record<string, SavedEnvironment>>(readSavedEnvironments)
  const [domain, setDomain] = useState('')
  const [path, setPath] = useState('')
  const [accounts, setAccounts] = useState<Account[]>(readAccounts)
  const [token, setToken] = useState('')
  const [loadingAccountId, setLoadingAccountId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'idle' | 'success' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const [environmentDropdownOpen, setEnvironmentDropdownOpen] = useState(false)

  useEffect(() => {
    const lastEnvironment = localStorage.getItem(LAST_ENVIRONMENT_KEY)?.trim() || ''
    const saved = lastEnvironment ? readSavedEnvironments()[lastEnvironment] : undefined
    if (!saved) return
    setEnvironment(lastEnvironment)
    setDomain(saved.domain)
    setPath(saved.path)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
    } catch {
      // Storage may be disabled or full; editing and login still work in memory.
    }
  }, [accounts])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), messageType === 'error' ? 5_000 : 3_500)
    return () => window.clearTimeout(timer)
  }, [message, messageType])

  const selectEnvironment = (value: string) => {
    setEnvironment(value)
    const saved = savedEnvironments[value.trim()]
    if (!saved) return
    setDomain(saved.domain)
    setPath(saved.path)
    setToken('')
    try {
      localStorage.setItem(LAST_ENVIRONMENT_KEY, value.trim())
    } catch {
      // Storage may be disabled; selecting still works in memory.
    }
  }

  const saveEnvironment = (showMessage = true) => {
    const key = environment.trim()
    if (!key) {
      if (showMessage) { setMessage('请输入环境名称'); setMessageType('error') }
      return false
    }
    if (!domain.trim() || !path.trim()) {
      if (showMessage) { setMessage('请填写接口域名和登录接口'); setMessageType('error') }
      return false
    }

    const next = { ...readSavedEnvironments(), [key]: { domain: domain.trim(), path: path.trim() } }
    try {
      localStorage.setItem(SAVED_ENVIRONMENTS_KEY, JSON.stringify(next))
      localStorage.setItem(LAST_ENVIRONMENT_KEY, key)
      setSavedEnvironments(next)
      if (showMessage) { setMessage(`环境“${key}”已保存`); setMessageType('success') }
      return true
    } catch {
      if (showMessage) { setMessage('环境保存失败，请检查浏览器存储权限'); setMessageType('error') }
      return false
    }
  }

  const updateAccount = (id: string, field: keyof Omit<Account, 'id'>, value: string) => {
    setAccounts((current) => current.map((account) => account.id === id ? { ...account, [field]: value } : account))
  }

  const addAccount = () => {
    setAccounts((current) => [...current, createAccount()])
  }

  const environmentNames = Object.keys(savedEnvironments).sort((left, right) => left.localeCompare(right, 'zh-CN'))

  const copyToken = async (value = token) => {
    if (!value || !navigator.clipboard) return false
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
      return true
    } catch {
      setCopied(false)
      return false
    }
  }

  const handleLogin = async (account: Account) => {
    setMessage('')
    setMessageType('idle')
    if (!environment.trim()) { setMessage('请先输入或选择环境'); setMessageType('error'); return }

    let url: string
    try {
      url = buildLoginUrl(domain, path)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '接口地址不正确')
      setMessageType('error')
      return
    }
    if (!account.userName.trim()) { setMessage('请输入账号'); setMessageType('error'); return }
    if (!account.password) { setMessage('请输入密码'); setMessageType('error'); return }
    if (!account.terminalType.trim()) { setMessage('请输入渠道'); setMessageType('error'); return }
    saveEnvironment(false)

    setLoadingAccountId(account.id)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: account.userName.trim(),
          password: account.password,
          terminalType: account.terminalType.trim(),
        }),
      })
      const payload = await response.json() as TokenResponse
      if (!response.ok) throw new Error(payload.message || `请求失败（${response.status}）`)
      if (payload.code !== 0) throw new Error(payload.message || `登录失败（code: ${String(payload.code ?? '未知')}）`)
      const sessionId = payload.data?.sessionId?.trim()
      if (!sessionId) throw new Error('接口返回成功，但 data.sessionId 为空')
      setToken(sessionId)
      const didCopy = await copyToken(sessionId)
      const label = account.name.trim() || account.userName.trim()
      setMessage(didCopy ? `${label} 登录成功，Token 已自动复制` : `${label} 登录成功，请点击下方按钮复制 Token`)
      setMessageType('success')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败，请检查接口地址和跨域设置')
      setMessageType('error')
    } finally {
      setLoadingAccountId(null)
    }
  }

  return (
    <section className="token-panel" aria-label="获取 Token">
      {message && (
        <div className={`page-toast ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>
          {messageType === 'error' ? <CircleAlert size={20} /> : <CircleCheck size={20} />}
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} aria-label="关闭提示"><X size={16} /></button>
        </div>
      )}
      <div className="token-panel-header">
        <div>
          <p className="eyebrow">AUTHENTICATION TOOL</p>
          <h1>获取 Token</h1>
          <p className="panel-description">选择环境和账号，快速获取并复制会话 Token</p>
        </div>
        <div className="token-header-icon" aria-hidden="true"><KeyRound size={22} /></div>
      </div>

      <div className="token-form">
        <section className="config-section" aria-labelledby="environment-title">
          <div className="config-section-heading">
            <div><h2 id="environment-title">环境配置</h2><p>每个环境单独保存接口域名和登录接口</p></div>
          </div>
          <div className="environment-grid">
            <div className="field">
              <label htmlFor="environment-name">环境名称</label>
              <div
                className="input-with-icon environment-combobox"
                onBlur={(event) => {
                  const nextTarget = event.relatedTarget
                  if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setEnvironmentDropdownOpen(false)
                }}
              >
                <Globe2 size={17} aria-hidden="true" />
                <input
                  id="environment-name"
                  value={environment}
                  onChange={(event) => { selectEnvironment(event.target.value); setEnvironmentDropdownOpen(true) }}
                  onFocus={() => setEnvironmentDropdownOpen(true)}
                  placeholder="选择或输入，例如 test"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={environmentDropdownOpen}
                  aria-controls="saved-environment-options"
                  aria-autocomplete="none"
                />
                <button className="environment-dropdown-button" type="button" onClick={() => setEnvironmentDropdownOpen((open) => !open)} aria-label="展开全部环境" aria-expanded={environmentDropdownOpen}>
                  <ChevronDown size={16} />
                </button>
                {environmentDropdownOpen && (
                  <div className="environment-options" id="saved-environment-options" role="listbox">
                    {environmentNames.length ? environmentNames.map((name) => (
                      <button className={name === environment ? 'selected' : ''} type="button" role="option" aria-selected={name === environment} onClick={() => { selectEnvironment(name); setEnvironmentDropdownOpen(false) }} key={name}>
                        <span>{name}</span>
                        <small>{savedEnvironments[name].domain}</small>
                      </button>
                    )) : <p>暂无已保存环境</p>}
                  </div>
                )}
              </div>
            </div>
            <label className="field"><span>接口域名</span><div className="input-with-icon"><Server size={17} aria-hidden="true" /><input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="例如 api.example.com" spellCheck="false" /></div></label>
            <label className="field"><span>登录接口</span><div className="input-with-icon"><span className="path-prefix" aria-hidden="true">/</span><input value={path} onChange={(event) => setPath(event.target.value)} placeholder="例如 /api/user/login" spellCheck="false" /></div></label>
            <button className="save-environment-button" type="button" onClick={() => saveEnvironment()}><Save size={16} /> 保存环境</button>
          </div>
        </section>

        <section className="config-section" aria-labelledby="accounts-title">
          <div className="config-section-heading account-section-heading">
            <div><h2 id="accounts-title">账号配置</h2><p>账号列表会自动保存在当前浏览器中</p></div>
            <button className="add-account-button" type="button" onClick={addAccount}><Plus size={16} /> 添加账号</button>
          </div>
          <div className="account-list">
            {accounts.map((account) => (
              <div className="account-row" key={account.id}>
                <label className="field"><span>名称（可空）</span><input value={account.name} onChange={(event) => updateAccount(account.id, 'name', event.target.value)} placeholder="例如 测试账号" /></label>
                <label className="field"><span>账号</span><div className="input-with-icon"><UserRound size={17} aria-hidden="true" /><input value={account.userName} onChange={(event) => updateAccount(account.id, 'userName', event.target.value)} placeholder="请输入账号" autoComplete="off" /></div></label>
                <label className="field"><span>密码</span><div className="input-with-icon"><LockKeyhole size={17} aria-hidden="true" /><input type="password" value={account.password} onChange={(event) => updateAccount(account.id, 'password', event.target.value)} placeholder="请输入密码" autoComplete="off" /></div></label>
                <label className="field"><span>渠道</span><input value={account.terminalType} onChange={(event) => updateAccount(account.id, 'terminalType', event.target.value)} placeholder="例如 APP" /></label>
                <button className="login-button" type="button" onClick={() => void handleLogin(account)} disabled={loadingAccountId !== null}>
                  {loadingAccountId === account.id ? <LoaderCircle size={17} className="spin" /> : <LogIn size={17} />}
                  {loadingAccountId === account.id ? '登录中...' : '登录'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="token-result">
        <div className="result-heading"><span>当前 Token</span><span className="result-hint">data.sessionId</span></div>
        <div className="token-output-row">
          <input className="token-output" value={token} onChange={(event) => setToken(event.target.value)} placeholder="登录成功后 Token 将显示在这里" spellCheck="false" aria-label="当前 Token" />
          <button className="copy-token-button" type="button" onClick={() => void copyToken()} disabled={!token} title="复制 Token" aria-label="复制 Token">{copied ? <Check size={17} /> : <Clipboard size={17} />}<span>{copied ? '已复制' : '复制'}</span></button>
        </div>
      </div>
    </section>
  )
}
