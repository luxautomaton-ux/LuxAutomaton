import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function AutopilotPage() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  async function loadStatus() {
    try {
      const data = await api('/api/automation/status')
      setState(data.state)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleAutomation() {
    if (!state) return
    try {
      const data = await api('/api/automation/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: !state.enabled })
      })
      setState(data.state)
    } catch (err) {
      setError(err.message)
    }
  }

  async function triggerRun() {
    try {
      await api('/api/automation/trigger', { method: 'POST' })
      loadStatus()
    } catch (err) {
      setError(err.message)
    }
  }

  const isRunning = state?.status !== 'idle'

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            Autopilot
            {state?.enabled && (
              <span className="relative flex h-3 w-3 ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            )}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            24/7 automated channel management: research, create, optimize, publish.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={triggerRun} 
            disabled={isRunning || loading}
            className="bg-surface-container border border-outline-variant/30 text-on-surface font-label-caps text-label-caps px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-surface-variant transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${isRunning ? 'animate-spin' : ''}`}>
              {isRunning ? 'progress_activity' : 'play_arrow'}
            </span>
            {isRunning ? 'RUNNING...' : 'FORCE RUN NOW'}
          </button>
          
          <button 
            onClick={toggleAutomation}
            disabled={loading}
            className={`font-label-caps text-label-caps px-6 py-2 rounded-xl flex items-center gap-2 transition-all shadow-card ${
              state?.enabled 
                ? 'bg-primary-container text-on-primary-container border border-primary-container/50 shadow-glow-red' 
                : 'bg-surface-container-lowest text-on-surface border border-outline-variant/20'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {state?.enabled ? 'power' : 'power_off'}
            </span>
            {state?.enabled ? 'AUTOPILOT ON' : 'AUTOPILOT OFF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 border border-error/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-error flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Status Pipeline */}
        <div className="lg:col-span-8">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-outline-variant/20 bg-surface-container-high/30 flex justify-between items-center">
              <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">route</span>
                PIPELINE STATUS
              </h3>
              <span className={`font-data-mono text-[10px] px-2.5 py-1 rounded-lg border ${
                isRunning 
                  ? 'bg-primary-container/20 border-primary-container/40 text-primary' 
                  : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant'
              }`}>
                {state?.status?.toUpperCase() || 'LOADING...'}
              </span>
            </div>
            
            <div className="p-6">
              {!state?.enabled && !isRunning ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-20 mb-4">snooze</span>
                  <p className="font-data-mono text-data-mono text-on-surface-variant">Autopilot is disabled. Enable it to run the daily publishing loop.</p>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.15rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant/20 before:to-transparent">
                  {/* Pipeline Steps */}
                  {[
                    { id: 'strategy', icon: 'lightbulb', label: 'Strategy & Research', desc: 'Analyzing trends and picking topic' },
                    { id: 'script', icon: 'edit_document', label: 'Script Generation', desc: 'Writing hook and body with Ollama' },
                    { id: 'render', icon: 'movie', label: 'Video Rendering', desc: 'Generating visuals via Hyperframes/HeyGen' },
                    { id: 'thumbnail', icon: 'image', label: 'Thumbnail Generation', desc: 'Generating image via OpenCode DALL-E' },
                    { id: 'seo', icon: 'search', label: 'SEO Optimization', desc: 'Crafting title, description, and tags' },
                    { id: 'publish', icon: 'upload', label: 'YouTube Publish', desc: 'Uploading to connected channel' }
                  ].map((step, i) => {
                    
                    const isPast = ['strategy', 'script', 'render', 'thumbnail', 'seo', 'publish'].indexOf(state?.status) > i
                    const isCurrent = state?.status === step.id
                    
                    let statusColor = 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant'
                    let iconColor = 'text-on-surface-variant opacity-50'
                    
                    if (isCurrent) {
                      statusColor = 'bg-primary-container/20 border-primary-container/40 text-primary shadow-glow-red'
                      iconColor = 'text-primary animate-pulse'
                    } else if (isPast || (state?.status === 'idle' && state?.last_run)) {
                      statusColor = 'bg-[#39FF14]/10 border-[#39FF14]/30 text-[#39FF14]'
                      iconColor = 'text-[#39FF14]'
                    }

                    return (
                      <div key={step.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-surface-container bg-surface-container-lowest text-on-surface-variant shadow-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>{step.icon}</span>
                        </div>
                        
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl border transition-all ${statusColor}">
                          <div className={`font-label-caps text-[10px] mb-1 ${isCurrent ? 'text-primary' : 'text-on-surface-variant'}`}>
                            STEP 0{i + 1}
                          </div>
                          <div className={`font-body-md text-[14px] font-bold ${isCurrent ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                            {step.label}
                          </div>
                          <div className="font-data-mono text-[11px] text-on-surface-variant mt-1">
                            {isCurrent && state?.current_job?.step ? state.current_job.step : step.desc}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule & History */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
              <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                SCHEDULE
              </h3>
            </div>
            <div className="p-5 space-y-3 font-data-mono text-[12px]">
              <div className="flex justify-between items-center p-3 bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10">
                <span className="text-on-surface-variant">Last Run</span>
                <span className="text-on-surface">{state?.last_run ? new Date(state.last_run).toLocaleString() : 'Never'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10">
                <span className="text-on-surface-variant">Next Run</span>
                <span className={state?.enabled ? 'text-[#39FF14]' : 'text-error'}>
                  {state?.enabled ? '06:00 AM Daily' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden h-full">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
              <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">history</span>
                PUBLISH HISTORY
              </h3>
            </div>
            <div className="p-5">
              {state?.history?.length > 0 ? (
                <div className="space-y-3">
                  {state.history.map((item, i) => (
                    <div key={i} className="p-3 bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-body-md text-[13px] text-on-surface font-bold truncate pr-2">{item.title}</span>
                        <span className={`font-label-caps text-[9px] px-2 py-0.5 rounded-md border ${item.status === 'published' ? 'bg-[#39FF14]/10 border-[#39FF14]/30 text-[#39FF14]' : 'bg-error-container/20 border-error/30 text-error'}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center font-data-mono text-[10px] text-on-surface-variant mt-2">
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                        {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View Video ↗</a>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="font-data-mono text-data-mono text-on-surface-variant">No published videos yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
