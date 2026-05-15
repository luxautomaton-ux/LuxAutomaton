import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function AIModelsPage() {
  const [models, setModels] = useState([])
  const [modelRec, setModelRec] = useState(null)
  const [selectedModel, setSelectedModel] = useState('')
  const [applyResult, setApplyResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { loadModels() }, [])

  async function loadModels() {
    setLoading(true)
    setError('')
    try {
      const [listRes, recRes] = await Promise.all([
        api('/api/models/list'),
        api('/api/models/recommend'),
      ])
      const m = listRes?.models || []
      setModels(m)
      setModelRec(recRes)
      if (!selectedModel && m.length) setSelectedModel(m[0].name)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function applyModel() {
    if (!selectedModel) { setError('Select a model first.'); return }
    setLoading(true); setError('')
    try {
      const data = await api('/api/models/set', { method: 'POST', body: JSON.stringify({ model: selectedModel }) })
      setApplyResult(data)
      setNotice(data.message || 'Model applied.')
      await loadModels()
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  async function autoSet() {
    setLoading(true); setError('')
    try {
      const data = await api('/api/models/auto-set', { method: 'POST' })
      setApplyResult(data)
      setNotice(data.message || 'Auto-set complete.')
      await loadModels()
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">AI Models Management</h1>
          <p className="font-data-mono text-data-mono text-secondary mt-1">
            Local Inference via Ollama · {models.length} model{models.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <button onClick={loadModels} className="bg-surface-container border border-outline-variant/30 text-on-surface font-label-caps text-label-caps px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-surface-variant transition-colors">
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span> REFRESH
        </button>
      </div>

      {error && <div className="bg-error-container/20 border border-error/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-error">{error}</div>}
      {notice && <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-[#39FF14]">{notice}</div>}

      {/* Recommendation + Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
            <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">recommend</span> RECOMMENDED
            </h3>
          </div>
          <div className="p-5">
            <div className="font-data-mono text-[18px] text-primary font-bold">{modelRec?.recommended_model || 'Loading...'}</div>
            <div className="font-data-mono text-[11px] text-on-surface-variant mt-2">{modelRec?.explain_simple || ''}</div>
            <div className="flex items-center gap-2 mt-3">
              <span className="font-label-caps text-[10px] text-on-surface-variant">SPEED:</span>
              <span className="font-data-mono text-data-mono text-on-surface">{modelRec?.estimated_speed || '—'}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
            <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">tune</span> SELECT MODEL
            </h3>
          </div>
          <div className="p-5">
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-data-mono text-data-mono p-3 rounded-xl outline-none focus:border-primary transition-colors">
              {models.map((m) => <option key={m.name} value={m.name}>{m.name} ({m.status})</option>)}
            </select>
            <div className="flex gap-3 mt-4">
              <button onClick={applyModel} className="flex-1 bg-inverse-primary text-white font-label-caps text-[11px] px-4 py-3 rounded-xl hover:bg-primary-container transition-colors shadow-glow-red">APPLY SELECTED</button>
              <button onClick={autoSet} className="flex-1 bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-label-caps text-[11px] px-4 py-3 rounded-xl hover:border-outline-variant/40 transition-colors">AUTO SET STACK</button>
            </div>
          </div>
        </div>
      </div>

      {/* Applied result */}
      {applyResult?.updated_files?.length > 0 && (
        <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card p-5">
          <h3 className="font-label-caps text-label-caps text-on-surface mb-3">UPDATED FILES</h3>
          <div className="flex flex-wrap gap-2">
            {applyResult.updated_files.map((f) => (
              <span key={f} className="bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] font-data-mono text-[11px] px-3 py-1.5 rounded-lg">{f}</span>
            ))}
          </div>
        </div>
      )}

      {/* Models Table */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
          <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">list</span> AVAILABLE MODELS
          </h3>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {models.length === 0 && !loading && (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant opacity-30">cloud_off</span>
              <p className="font-data-mono text-data-mono text-on-surface-variant mt-2">No models found. Start Ollama and pull a model:</p>
              <code className="font-data-mono text-[12px] text-primary mt-2 block">ollama pull qwen2.5:7b</code>
            </div>
          )}
          {models.map((m) => (
            <div key={m.name} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-lowest/30 transition-colors">
              <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
              <div className="flex-1">
                <div className="font-data-mono text-data-mono text-on-surface font-bold">{m.name}</div>
              </div>
              <span className={`font-label-caps text-[10px] px-3 py-1 rounded-lg border ${m.status === 'available' ? 'bg-[#39FF14]/10 border-[#39FF14]/20 text-[#39FF14]' : 'bg-[#FFBF00]/10 border-[#FFBF00]/20 text-[#FFBF00]'}`}>{m.status?.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
