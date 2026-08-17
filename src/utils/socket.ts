export function buildSocketUrl(address: string, port: string, key = ''): string {
  const rawAddress = address.trim()
  if (!rawAddress) throw new Error('请输入 Socket 地址')

  // Allow users to paste a host, an HTTP URL, or a full WebSocket URL.
  const withProtocol = /^(wss?|https?):\/\//i.test(rawAddress)
    ? rawAddress
    : `ws://${rawAddress}`
  const url = new URL(withProtocol)

  if (url.protocol === 'http:') url.protocol = 'ws:'
  if (url.protocol === 'https:') url.protocol = 'wss:'
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error('地址必须使用 ws:// 或 wss:// 协议')
  }

  if (port.trim()) {
    if (!/^\d{1,5}$/.test(port.trim()) || Number(port) > 65535) {
      throw new Error('端口号应为 1 到 65535 之间的数字')
    }
    url.port = port.trim()
  }

  // Keep the key in the query string so the Socket server can authenticate it.
  if (key.trim()) url.searchParams.set('key', key.trim())

  return url.toString()
}
