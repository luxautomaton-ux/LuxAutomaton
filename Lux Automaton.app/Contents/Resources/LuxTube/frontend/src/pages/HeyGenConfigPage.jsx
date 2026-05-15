import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function HeyGenConfigPage() {
  const [status, setStatus] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    setLoading(true)
    try {
      const data = await api('/api/heygen/status')
      setStatus(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function connectKey() {
    if (!apiKey.trim()) { setError('Enter your HEYGEN_API_KEY first.'); return }
    setLoading(true); setError(''); setNotice('')
    try {
      const data = await api('/api/heygen/connect', { method: 'POST', body: JSON.stringify({ api_key: apiKey.trim() }) })
      setStatus(data)
      setApiKey('')
      setNotice(data.message || 'HeyGen connected.')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-1">HeyGen Integration</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage API credentials for cloud avatar rendering.</p>
        </div>
        <button onClick={loadStatus} className="bg-surface-container border border-outline-variant/30 text-on-surface font-label-caps text-label-caps px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-surface-variant transition-colors">
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span> REFRESH
        </button>
      </div>

      {error && <div className="bg-error-container/20 border border-error/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-error">{error}</div>}
      {notice && <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-[#39FF14]">{notice}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Connection Status */}
        <section className="xl:col-span-5">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden h-full">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30 flex items-center justify-between">
              <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">vpn_key</span> CONNECTION
              </h3>
              {status && (
                <span className={`font-label-caps text-[10px] px-3 py-1 rounded-lg border ${status.connected ? 'bg-[#39FF14]/10 border-[#39FF14]/20 text-[#39FF14]' : 'bg-error-container/20 border-error/30 text-error'}`}>
                  {status.connected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              )}
            </div>
            <div className="p-5 space-y-4">
              {/* Live status readout */}
              <div className="space-y-2">
                {[
                  { label: 'API Key', ok: status?.api_key_configured },
                  { label: 'CLI Installed', ok: status?.cli_installed },
                  { label: 'MCP Configured', ok: status?.mcp_configured },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-b-0">
                    <span className="font-data-mono text-[12px] text-on-surface">{item.label}</span>
                    <span className={`font-label-caps text-[10px] ${item.ok ? 'text-[#39FF14]' : 'text-on-surface-variant'}`}>{item.ok ? 'YES' : 'NO'}</span>
                  </div>
                ))}
              </div>
              <div className="font-data-mono text-[11px] text-on-surface-variant bg-surface-container-lowest/50 p-3 rounded-xl border border-outline-variant/10">
                {status?.summary || 'Loading...'}
              </div>
            </div>
          </div>
        </section>

        {/* Connect Form */}
        <section className="xl:col-span-7">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden h-full">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
              <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">link</span> CONNECT API KEY
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1.5">HEYGEN API KEY</label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-data-mono text-data-mono p-3 pr-12 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your HeyGen API key here..."
                  />
                  <button onClick={() => setShowKey(!showKey)} className="material-symbols-outlined absolute right-3 top-3 text-on-surface-variant text-[18px] cursor-pointer hover:text-on-surface transition-colors">
                    {showKey ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
              </div>
              <button onClick={connectKey} disabled={loading} className="w-full bg-inverse-primary text-white font-label-caps text-label-caps py-3 rounded-xl font-bold hover:bg-primary-container transition-colors shadow-glow-red disabled:opacity-50 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">link</span>
                {loading ? 'CONNECTING...' : 'CONNECT HEYGEN'}
              </button>
              <div className="bg-[#FFBF00]/10 border border-[#FFBF00]/20 p-4 rounded-xl flex items-start gap-3">
                <span className="material-symbols-outlined text-[#FFBF00] mt-0.5 text-[18px]">warning</span>
                <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed">Rotating the API key invalidates any queued generation tasks. Proceed with caution during active renders.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
