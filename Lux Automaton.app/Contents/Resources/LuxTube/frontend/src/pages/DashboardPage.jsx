import React, { useEffect, useState } from 'react'
import { api, statusLabel, statusColor, statusDot } from '../lib/api'

export default function DashboardPage() {
  const [systemProfile, setSystemProfile] = useState(null)
  const [modelRec, setModelRec] = useState(null)
  const [hyperframesInfo, setHyperframesInfo] = useState(null)
  const [heygenStatus, setHeygenStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { bootstrap() }, [])

  async function bootstrap() {
    setLoading(true)
    setError('')
    const results = await Promise.allSettled([
      api('/api/system/profile'),
      api('/api/models/recommend'),
      api('/api/hyperframes/info'),
      api('/api/heygen/status'),
    ])
    if (results[0]?.status === 'fulfilled') setSystemProfile(results[0].value)
    if (results[1]?.status === 'fulfilled') setModelRec(results[1].value)
    if (results[2]?.status === 'fulfilled') setHyperframesInfo(results[2].value)
    if (results[3]?.status === 'fulfilled') setHeygenStatus(results[3].value)

    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length === results.length) {
      setError('Backend offline — start the server with: python server.py')
    }
    setLoading(false)
  }

  const sys = systemProfile?.system || {}
  const ollamaOk = Boolean(sys.ollama_running)
  const hyperOk = Boolean(hyperframesInfo?.installed)
  const heygenOk = Boolean(heygenStatus?.api_key_configured)

  return (
    <div className="space-y-5">
      {/* Status Bar */}
      {error && (
        <div className="bg-error-container/20 border border-error/30 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <span className="font-data-mono text-[13px] text-error">{error}</span>
          <button onClick={bootstrap} className="ml-auto bg-surface-container border border-outline-variant/30 px-3 py-1 rounded-lg font-label-caps text-[10px] text-on-surface hover:bg-surface-variant transition-colors">RETRY</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 auto-rows-min">
        {/* Runtime Status (replaces Live Data Stream with real data) */}
        <div className="md:col-span-8 md:row-span-2 bg-surface-container border border-outline-variant/30 rounded-2xl flex flex-col overflow-hidden shadow-card h-full min-h-[350px]">
          <div className="px-5 py-3 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-high/30">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface text-[16px]">podcasts</span>
              <h2 className="font-label-caps text-label-caps text-on-surface tracking-widest">SYSTEM OVERVIEW</h2>
            </div>
            <button onClick={bootstrap} className="flex items-center gap-2 px-3 py-1 bg-surface-container-lowest border border-outline-variant/20 rounded-full hover:bg-surface-variant transition-colors">
              <span className={`material-symbols-outlined text-[14px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              <span className="font-label-caps text-[10px] text-on-surface">REFRESH</span>
            </button>
          </div>

          <div className="flex-grow relative bg-surface-container-lowest">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#333535_1px,transparent_1px),linear-gradient(to_bottom,#333535_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-6">
              {loading ? (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary animate-spin text-[32px]">progress_activity</span>
                  <span className="font-data-mono text-data-mono text-on-surface-variant">Connecting to backend...</span>
                </div>
              ) : systemProfile ? (
                <>
                  <div className="text-center">
                    <div className="font-headline-md text-[28px] text-on-surface font-bold">{systemProfile.hardware_summary}</div>
                    <div className="font-data-mono text-data-mono text-on-surface-variant mt-2">{systemProfile.runtime_summary}</div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-30">cloud_off</span>
                  <p className="font-data-mono text-data-mono text-on-surface-variant mt-2">Backend not reachable</p>
                </div>
              )}
            </div>

            {/* Bottom stats from real data */}
            <div className="absolute bottom-0 left-0 w-full p-4 grid grid-cols-4 gap-3">
              {[
                { label: 'OLLAMA', value: statusLabel(ollamaOk), color: statusColor(ollamaOk) },
                { label: 'HYPERFRAMES', value: statusLabel(hyperOk), color: statusColor(hyperOk) },
                { label: 'HEYGEN', value: heygenOk ? 'CONFIGURED' : 'NOT SET', color: statusColor(heygenOk) },
                { label: 'CPU CORES', value: String(sys.cpu_cores || '—'), color: 'text-on-surface' },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface/80 backdrop-blur-sm border border-outline-variant/20 p-3 rounded-xl flex flex-col">
                  <span className="font-label-caps text-label-caps text-on-surface-variant text-[10px]">{stat.label}</span>
                  <span className={`font-data-mono text-data-mono ${stat.color} font-bold`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service Health */}
        <div className="md:col-span-4 bg-surface-container border border-outline-variant/30 rounded-2xl flex flex-col overflow-hidden shadow-card">
          <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
            <h2 className="font-label-caps text-label-caps text-on-surface tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">speed</span>
              SERVICE HEALTH
            </h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {[
              { label: 'Ollama Local LLM', ok: ollamaOk, detail: ollamaOk ? `${sys.models_count || 0} models loaded` : 'Start with: ollama serve' },
              { label: 'Hyperframes Engine', ok: hyperOk, detail: hyperOk ? hyperframesInfo?.cli_path || 'via npx' : 'Not installed' },
              { label: 'HeyGen Cloud', ok: heygenOk, detail: heygenStatus?.summary || 'Not configured' },
            ].map((svc) => (
              <div key={svc.label} className="flex items-start gap-3 p-3 bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10">
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${statusDot(svc.ok)}`}></span>
                <div className="flex-1 min-w-0">
                  <div className="font-body-md text-[13px] text-on-surface font-bold">{svc.label}</div>
                  <div className="font-data-mono text-[11px] text-on-surface-variant truncate">{svc.detail}</div>
                </div>
                <span className={`font-label-caps text-[10px] ${statusColor(svc.ok)}`}>{statusLabel(svc.ok)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Recommendation */}
        <div className="md:col-span-4 bg-surface-container border border-outline-variant/30 rounded-2xl flex flex-col overflow-hidden shadow-card">
          <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
            <h2 className="font-label-caps text-label-caps text-on-surface tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              RECOMMENDED MODEL
            </h2>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <div className="font-data-mono text-[18px] text-primary font-bold">{modelRec?.recommended_model || '—'}</div>
            <div className="font-data-mono text-[11px] text-on-surface-variant">{modelRec?.explain_simple || 'Loading...'}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-label-caps text-[10px] text-on-surface-variant">SPEED:</span>
              <span className="font-data-mono text-data-mono text-on-surface">{modelRec?.estimated_speed || '—'}</span>
            </div>
            {modelRec?.available_models?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {modelRec.available_models.map((m) => (
                  <span key={m} className={`font-data-mono text-[10px] px-2 py-1 rounded-lg border ${m === modelRec.recommended_model ? 'bg-primary-container/20 border-primary-container/30 text-primary' : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant'}`}>{m}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="md:col-span-12 bg-surface-container border border-outline-variant/30 rounded-2xl flex flex-col overflow-hidden shadow-card">
          <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
            <h2 className="font-label-caps text-label-caps text-on-surface tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              QUICK ACTIONS
            </h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10 p-4 flex items-start gap-4 hover:shadow-card-hover transition-shadow cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">troubleshoot</span>
              </div>
              <div>
                <div className="font-body-md text-[14px] text-on-surface font-bold">Run Viral Scanner</div>
                <div className="font-data-mono text-[11px] text-on-surface-variant">Scan competitor channels for winning hooks and patterns</div>
              </div>
            </div>
            <div className="bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10 p-4 flex items-start gap-4 hover:shadow-card-hover transition-shadow cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-[#39FF14]/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#39FF14] text-[20px]">smart_toy</span>
              </div>
              <div>
                <div className="font-body-md text-[14px] text-on-surface font-bold">Auto-Set Models</div>
                <div className="font-data-mono text-[11px] text-on-surface-variant">Let the system choose the best model for your hardware</div>
              </div>
            </div>
            <div className="bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10 p-4 flex items-start gap-4 hover:shadow-card-hover transition-shadow cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-[#FFBF00]/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#FFBF00] text-[20px]">videocam</span>
              </div>
              <div>
                <div className="font-body-md text-[14px] text-on-surface font-bold">Generate Video</div>
                <div className="font-data-mono text-[11px] text-on-surface-variant">Create production-ready content with Hyperframes or HeyGen</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
