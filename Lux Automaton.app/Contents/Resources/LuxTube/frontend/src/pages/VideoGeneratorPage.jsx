import React, { useState } from 'react'
import { api } from '../lib/api'

const engines = [
  { id: 'hyperframes', label: 'Hyperframes', desc: 'Local-first video engine', icon: 'animation', tag: 'DEFAULT', tagColor: 'text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/20' },
  { id: 'heygen', label: 'HeyGen', desc: 'Cloud avatar rendering', icon: 'face', tag: 'CLOUD', tagColor: 'text-[#FFBF00] bg-[#FFBF00]/10 border-[#FFBF00]/20' },
  { id: 'local', label: 'Local Pipeline', desc: 'Custom render pipeline', icon: 'precision_manufacturing', tag: 'CUSTOM', tagColor: 'text-on-surface-variant bg-surface-variant/30 border-outline-variant/20' },
]

export default function VideoGeneratorPage() {
  const [selectedEngine, setSelectedEngine] = useState('hyperframes')
  const [script, setScript] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generateVideo() {
    if (!script.trim()) { setError('Write a script before generating.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await api('/api/video/generate', {
        method: 'POST',
        body: JSON.stringify({ script, engine: selectedEngine, style: 'youtube-control-room' }),
      })
      setResult(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Video Generator</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Write a script, pick an engine, and generate production-ready content.</p>
      </div>

      {error && <div className="bg-error-container/20 border border-error/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-error">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Script Editor */}
        <div className="xl:col-span-7">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden h-full flex flex-col">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30 flex justify-between items-center">
              <h2 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">edit_note</span> SCRIPT EDITOR
              </h2>
              <div className="font-data-mono text-[11px] text-on-surface-variant">{script.length} chars</div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="flex-1 min-h-[200px] w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-[14px] text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none resize-none leading-relaxed"
                placeholder="Write your production-ready script here..."
              />
              <button onClick={generateVideo} disabled={loading} className="mt-4 bg-inverse-primary text-white font-label-caps text-label-caps px-6 py-3 rounded-xl font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-glow-red active:scale-95 disabled:opacity-50 w-full md:w-auto">
                <span className="material-symbols-outlined text-[18px] icon-fill">{loading ? 'progress_activity' : 'play_arrow'}</span>
                {loading ? 'GENERATING...' : 'GENERATE VIDEO'}
              </button>
            </div>
          </div>
        </div>

        {/* Engine Selector */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
              <h2 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">tune</span> RENDER ENGINE
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {engines.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEngine(e.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    selectedEngine === e.id
                      ? 'bg-primary-container/10 border-primary-container/40 shadow-glow-red'
                      : 'bg-surface-container-lowest/50 border-outline-variant/20 hover:border-outline-variant/40 hover:shadow-card'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${selectedEngine === e.id ? 'bg-primary-container/20' : 'bg-surface-variant/30'}`}>
                    <span className={`material-symbols-outlined text-[22px] ${selectedEngine === e.id ? 'text-primary icon-fill' : 'text-on-surface-variant'}`}>{e.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-body-md text-[14px] text-on-surface font-bold">{e.label}</div>
                    <div className="font-data-mono text-[11px] text-on-surface-variant">{e.desc}</div>
                  </div>
                  <span className={`font-label-caps text-[9px] px-2.5 py-1 rounded-lg border ${e.tagColor}`}>{e.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-surface-container rounded-2xl border border-[#39FF14]/20 shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-[#39FF14]/10 bg-[#39FF14]/5">
                <h3 className="font-label-caps text-label-caps text-[#39FF14] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span> JOB QUEUED
                </h3>
              </div>
              <div className="p-5 space-y-2 font-data-mono text-data-mono">
                <div className="flex justify-between"><span className="text-on-surface-variant">Job ID</span><span className="text-on-surface">{result.job_id}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Engine</span><span className="text-on-surface">{result.engine}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Est. Time</span><span className="text-on-surface">{result.estimated_time}s</span></div>
                {result.output && <div className="flex justify-between"><span className="text-on-surface-variant">Output</span><span className="text-primary truncate ml-2">{result.output}</span></div>}
                <div className="text-on-surface-variant text-[11px] mt-2">{result.message}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
