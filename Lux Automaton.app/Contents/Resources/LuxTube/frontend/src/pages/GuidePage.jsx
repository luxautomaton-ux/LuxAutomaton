import React from 'react'

const logEntries = [
  { ts: '2024-05-20T14:32:01Z', level: 'ERROR', lBg: 'bg-error-container', lText: 'text-on-error-container', lBorder: 'border-error', service: 'heygen_worker_01', msg: 'Connection reset by peer during avatar render payload.', msgColor: 'text-error', trace: 'trc_9948a1' },
  { ts: '2024-05-20T14:31:45Z', level: 'INFO', lBg: 'bg-surface-container', lText: 'text-on-surface', lBorder: 'border-outline-variant', service: 'yt_sync_daemon', msg: 'Batch upload 124 completed successfully. 5 items synced.', msgColor: 'text-on-surface-variant', trace: 'trc_9948a0' },
  { ts: '2024-05-20T14:30:12Z', level: 'WARN', lBg: 'bg-[#FFBF00]/10', lText: 'text-[#FFBF00]', lBorder: 'border-[#FFBF00]/50', service: 'ollama_local', msg: 'High VRAM usage detected (94%). Throttling next generation request.', msgColor: 'text-[#FFBF00]', trace: 'trc_99489f' },
  { ts: '2024-05-20T14:28:55Z', level: 'INFO', lBg: 'bg-surface-container', lText: 'text-on-surface', lBorder: 'border-outline-variant', service: 'sys_monitor', msg: 'Routine telemetry payload dispatched to control server.', msgColor: 'text-on-surface-variant', trace: 'trc_99489e' },
  { ts: '2024-05-20T14:25:00Z', level: 'INFO', lBg: 'bg-surface-container', lText: 'text-on-surface', lBorder: 'border-outline-variant', service: 'scheduler', msg: "Cron job 'daily_cleanup' executed in 1.4s.", msgColor: 'text-on-surface-variant', trace: 'trc_99489d' },
]

const issues = [
  { dot: 'bg-error', label: 'ERR_SYNC_TIMEOUT (YouTube API)', desc: 'Occurs when the payload exceeds the standard YouTube API window. Usually tied to large 4K shorts batch uploads.', fix: '> Check active quotas in GCP Console.\n> Reduce batch_size in settings.json to <= 5.' },
  { dot: 'bg-[#FFBF00]', label: 'WARN_OLLAMA_LATENCY', desc: 'Local LLM generation taking longer than 30s per script section.', fix: '> Verify GPU VRAM usage.\n> Ensure correct model (e.g., mistral:instruct) is loaded into memory.' },
  { dot: 'bg-error', label: 'API_AUTH_FAILURE (HeyGen)', desc: 'Webhook signature validation failed or token expired.', fix: '> Regenerate API Key in HeyGen Dashboard.\n> Restart integration worker node.' },
]

export default function GuidePage() {
  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Documentation & Diagnostics</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Knowledge base, system architecture, and real-time operational logs.</p>
        </div>
        <div className="relative w-full max-w-2xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-data-mono text-data-mono py-3 pl-12 pr-4 focus:outline-none focus:border-on-surface focus:ring-0 transition-colors placeholder:text-on-surface-variant placeholder:opacity-50" placeholder="QUERY KNOWLEDGE BASE... (e.g., 'API Limits', 'Sync Error 401')" type="text" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="px-2 py-1 bg-surface border border-outline-variant font-data-mono text-[10px] text-on-surface-variant rounded">CTRL</kbd>
            <kbd className="px-2 py-1 bg-surface border border-outline-variant font-data-mono text-[10px] text-on-surface-variant rounded">K</kbd>
          </div>
        </div>
      </section>

      {/* Quick Start Cards */}
      <section>
        <div className="border-b border-outline-variant pb-2 mb-4">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant">QUICK START & INTEGRATION</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: 'memory', title: 'Ollama Local', desc: 'Configure local LLM endpoints for private script generation.', cta: 'INIT SETUP' },
            { icon: 'face', title: 'HeyGen API', desc: 'Avatar rendering pipeline and webhook configuration.', cta: 'VIEW DOCS' },
            { icon: 'animation', title: 'Hyperframes', desc: 'B-roll injection logic and asset synchronization rules.', cta: 'READ SPECS' },
          ].map((card) => (
            <div key={card.title} className="bg-surface border border-outline-variant p-5 hover:bg-surface-variant transition-colors cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-5xl">{card.icon}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-primary">{card.icon}</span>
                <h4 className="font-headline-sm text-headline-sm">{card.title}</h4>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4 h-10">{card.desc}</p>
              <div className="flex items-center text-primary font-data-mono text-data-mono gap-1 group-hover:gap-2 transition-all">
                {card.cta} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Split: Issues + Network */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Troubleshooting */}
        <section className="lg:col-span-7 bg-surface border border-outline-variant">
          <div className="p-5 border-b border-outline-variant bg-surface-container flex justify-between items-center">
            <h3 className="font-label-caps text-label-caps text-on-surface">KNOWN ISSUES & TROUBLESHOOTING</h3>
            <span className="material-symbols-outlined text-on-surface-variant text-sm">handyman</span>
          </div>
          <div className="flex flex-col">
            {issues.map((issue) => (
              <details key={issue.label} className="group border-b border-outline-variant last:border-b-0">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-highest transition-colors font-data-mono text-data-mono text-on-surface list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${issue.dot}`}></span>
                    <span>{issue.label}</span>
                  </div>
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform text-on-surface-variant">expand_more</span>
                </summary>
                <div className="p-4 pt-0 bg-surface-container-lowest text-on-surface-variant border-t border-outline-variant border-dashed">
                  <p className="mb-2">{issue.desc}</p>
                  <div className="bg-background p-2 border border-outline-variant text-[11px] font-data-mono text-secondary whitespace-pre-line">{issue.fix}</div>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Network Topology */}
        <section className="lg:col-span-5 bg-surface border border-outline-variant flex flex-col">
          <div className="p-5 border-b border-outline-variant bg-surface-container flex justify-between items-center">
            <h3 className="font-label-caps text-label-caps text-on-surface">NETWORK TOPOLOGY</h3>
            <div className="flex gap-2">
              <button className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-sm">refresh</span></button>
              <button className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-sm">fullscreen</span></button>
            </div>
          </div>
          <div className="flex-1 bg-surface-container-lowest relative overflow-hidden flex items-center justify-center p-8 min-h-[250px]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#333535_1px,transparent_1px),linear-gradient(to_bottom,#333535_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
            <div className="relative w-full max-w-[300px] aspect-square">
              {/* Center Node */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-surface border border-outline-variant rounded-xl z-10 flex items-center justify-center shadow-[0_0_15px_rgba(255,85,64,0.2)]">
                <span className="material-symbols-outlined text-primary text-xl">hub</span>
              </div>
              <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 100 100">
                <line stroke="#333535" strokeDasharray="2,2" strokeWidth="1" x1="50" x2="20" y1="50" y2="20" />
                <line stroke="#333535" strokeWidth="1" x1="50" x2="80" y1="50" y2="20" />
                <line className="opacity-50" stroke="#ff5540" strokeDasharray="2,2" strokeWidth="1" x1="50" x2="50" y1="50" y2="85" />
              </svg>
              <div className="absolute top-[10%] left-[10%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-surface-container border border-outline-variant rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-on-surface-variant text-sm">database</span></div>
                <span className="font-data-mono text-[9px] text-on-surface-variant">DB_CORE</span>
              </div>
              <div className="absolute top-[10%] right-[10%] translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-surface-container border border-outline-variant rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-[#39FF14] text-sm">cloud</span></div>
                <span className="font-data-mono text-[9px] text-[#39FF14]">YT_API</span>
              </div>
              <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 translate-y-1/2 flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-surface-container border border-error rounded-full flex items-center justify-center animate-pulse"><span className="material-symbols-outlined text-error text-sm">face</span></div>
                <span className="font-data-mono text-[9px] text-error">HEYGEN_W</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* System Health Log */}
      <section className="bg-surface border border-outline-variant">
        <div className="p-5 border-b border-outline-variant bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-label-caps text-label-caps text-on-surface">SYSTEM HEALTH LOG</h3>
            <div className="h-4 w-px bg-outline-variant hidden sm:block"></div>
            <span className="font-data-mono text-[10px] text-on-surface-variant animate-pulse">LIVE STREAM</span>
          </div>
          <div className="flex gap-2 font-data-mono text-[11px]">
            <button className="px-3 py-1 bg-surface-variant border border-outline-variant text-on-surface hover:bg-surface-container-highest transition-colors">ALL</button>
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant text-error hover:border-error transition-colors">ERROR</button>
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant text-[#FFBF00] hover:border-[#FFBF00] transition-colors">WARN</button>
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors">INFO</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-surface-container-lowest border-b border-outline-variant">
              <tr className="font-label-caps text-[10px] text-on-surface-variant">
                <th className="py-2 px-4 font-normal">TIMESTAMP</th>
                <th className="py-2 px-4 font-normal">LEVEL</th>
                <th className="py-2 px-4 font-normal">SERVICE</th>
                <th className="py-2 px-4 font-normal w-full">MESSAGE</th>
                <th className="py-2 px-4 font-normal text-right">TRACE_ID</th>
              </tr>
            </thead>
            <tbody className="font-data-mono text-data-mono divide-y divide-[#212121]">
              {logEntries.map((e) => (
                <tr key={e.trace} className="hover:bg-surface-variant transition-colors group">
                  <td className="py-2 px-4 text-on-surface-variant">{e.ts}</td>
                  <td className="py-2 px-4"><span className={`px-2 py-0.5 ${e.lBg} ${e.lText} border ${e.lBorder} text-[10px] uppercase`}>{e.level}</span></td>
                  <td className="py-2 px-4 text-on-surface">{e.service}</td>
                  <td className={`py-2 px-4 ${e.msgColor} truncate max-w-xs sm:max-w-md lg:max-w-xl`}>{e.msg}</td>
                  <td className="py-2 px-4 text-right text-on-surface-variant opacity-50 group-hover:opacity-100">{e.trace}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
