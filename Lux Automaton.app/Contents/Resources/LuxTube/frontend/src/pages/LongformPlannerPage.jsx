import React, { useState } from 'react'
import { api } from '../lib/api'

const defaultChannels = 'https://www.youtube.com/@MrBeast\nhttps://www.youtube.com/@alexhormozi'

export default function LongformPlannerPage() {
  const [channels, setChannels] = useState(defaultChannels)
  const [topic, setTopic] = useState('')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const channelList = channels.split('\n').map(l => l.trim()).filter(Boolean)

  async function generatePlan() {
    setLoading(true); setError('')
    try {
      const data = await api('/api/strategy/generate', {
        method: 'POST',
        body: JSON.stringify({ mode: 'longform', channels: channelList, topic: topic.trim() || undefined }),
      })
      setPlan(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Long-form Blueprint</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Build authority video outlines connected to conversion outcomes.</p>
        </div>
        <button onClick={generatePlan} disabled={loading} className="bg-inverse-primary text-white font-label-caps text-label-caps px-6 py-3 rounded-xl font-bold hover:bg-primary-container transition-colors flex items-center gap-2 shadow-glow-red disabled:opacity-50">
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'movie'}</span>
          {loading ? 'GENERATING...' : 'GENERATE LONG-FORM PLAN'}
        </button>
      </div>

      {error && <div className="bg-error-container/20 border border-error/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-error">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Inputs */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
              <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">topic</span> TOPIC (optional)
              </h3>
            </div>
            <div className="p-5">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-[13px] text-on-surface font-data-mono focus:border-primary outline-none transition-colors"
                placeholder="e.g., 'Why AI agents will replace SaaS'"
              />
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
              <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">list</span> CHANNELS
              </h3>
            </div>
            <div className="p-5">
              <textarea
                value={channels}
                onChange={(e) => setChannels(e.target.value)}
                className="w-full h-36 bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-[13px] text-on-surface font-data-mono focus:border-primary outline-none resize-none"
                placeholder="One channel URL per line..."
              />
              <div className="font-data-mono text-[11px] text-on-surface-variant mt-2">{channelList.length} channels</div>
            </div>
          </div>
        </div>

        {/* Plan Output */}
        <div className="lg:col-span-8">
          {!plan && !loading ? (
            <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-20">movie</span>
              <p className="font-data-mono text-data-mono text-on-surface-variant mt-3">Generate a long-form strategy from your channel evidence</p>
            </div>
          ) : plan && (
            <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30 flex justify-between items-center">
                <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#39FF14]">check_circle</span>
                  LONG-FORM BLUEPRINT
                </h3>
                <span className="font-data-mono text-[10px] text-on-surface-variant">Focus: {plan.focus}</span>
              </div>
              <div className="p-5 space-y-3">
                {(plan.plan || []).map((step, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10">
                    <div className="w-8 h-8 rounded-xl bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-data-mono text-[12px] text-primary font-bold">{i + 1}</span>
                    </div>
                    <span className="font-body-md text-[13px] text-on-surface leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
