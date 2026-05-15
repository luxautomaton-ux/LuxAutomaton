// Centralized API helper — all frontend pages call through this.
// The Vite dev server proxies /api → http://127.0.0.1:5174 (the Flask backend)

export async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '')

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data.error || data.message
    throw new Error(message || `Request failed (${response.status})`)
  }
  return data
}

export function statusLabel(ok) {
  return ok ? 'ONLINE' : 'OFFLINE'
}

export function statusColor(ok) {
  return ok ? 'text-[#39FF14]' : 'text-[#FF0000]'
}

export function statusDot(ok) {
  return ok ? 'bg-[#39FF14] shadow-glow-green' : 'bg-[#FF0000]'
}
