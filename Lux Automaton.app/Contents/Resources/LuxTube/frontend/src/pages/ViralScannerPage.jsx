import React, { useState } from 'react'
import { api } from '../lib/api'

const defaultChannels = 'https://www.youtube.com/@MrBeast\nhttps://www.youtube.com/@alexhormozi\nhttps://www.youtube.com/@AliAbdaal'

export default function ViralScannerPage() {
  const [channelsText, setChannelsText] = useState(defaultChannels)
  const [scanUrl, setScanUrl] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const channelList = channelsText.split('\n').map(l => l.trim()).filter(Boolean)

  async function runScan() {
    if (!channelList.length && !scanUrl.trim()) { setError('Add channels or paste a URL to scan.'); return }
    setLoading(true); setError('')
    try {
      const payload = { channels: channelList }
      if (scanUrl.trim()) payload.url = scanUrl.trim()
      const data = await api('/api/viral/scan', { method: 'POST', body: JSON.stringify(payload) })
      setScanResult(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      {/* Search + Action */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-4 w-full">
          <div className="relative w-full flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              className="w-full bg-surface-container-lowest text-on-background font-data-mono text-data-mono pl-10 pr-4 py-3 border border-outline-variant/20 rounded-xl focus:border-primary outline-none transition-colors placeholder:text-on-surface-variant placeholder:opacity-50"
              placeholder="Paste a channel URL for quick scan..."
              type="text"
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
            />
          </div>
          <button onClick={runScan} disabled={loading} className="bg-inverse-primary text-white font-body-md font-bold px-6 py-3 uppercase tracking-wide hover:bg-primary-container transition-colors flex-shrink-0 flex items-center gap-2 rounded-xl shadow-glow-red disabled:opacity-50">
            <span className={`material-symbols-outlined icon-fill ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'troubleshoot'}</span>
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </div>
        <div className="font-data-mono text-[11px] text-on-surface-variant">{channelList.length} channel{channelList.length !== 1 ? 's' : ''} loaded</div>
      </section>

      {error && <div className="bg-error-container/20 border border-error/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-error">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Channel Input */}
        <div className="lg:col-span-4">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
              <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">list</span> CHANNELS
              </h3>
            </div>
            <div className="p-5">
              <textarea
                value={channelsText}
                onChange={(e) => setChannelsText(e.target.value)}
                className="w-full h-48 bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-[13px] text-on-surface font-data-mono focus:border-primary outline-none resize-none"
                placeholder="One channel URL per line..."
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-8">
          {!scanResult && !loading && (
            <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-20">rocket_launch</span>
              <p className="font-data-mono text-data-mono text-on-surface-variant mt-3">Add channels and run the scanner to extract viral patterns</p>
            </div>
          )}

          {scanResult && (
            <div className="space-y-5">
              {/* Global Insights */}
              {scanResult.insights?.length > 0 && (
                <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30">
                    <h3 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">lightbulb</span>
                      GLOBAL INSIGHTS ({scanResult.scanned_count} channels)
                    </h3>
                  </div>
                  <div className="p-5">
                    <ul className="space-y-3">
                      {scanResult.insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 bg-surface-container-lowest/50 rounded-xl border border-outline-variant/10">
                          <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">arrow_right</span>
                          <span className="font-body-md text-[13px] text-on-surface">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Channel Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(scanResult.channels || []).map((ch) => (
                  <div key={ch.channel_id} className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow">
                    <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30 flex justify-between items-center">
                      <h4 className="font-body-md text-[14px] text-on-surface font-bold">{ch.channel_name}</h4>
                      <span className="font-data-mono text-[10px] text-on-surface-variant bg-surface-container-lowest px-2 py-1 rounded-lg">{ch.upload_cadence}</span>
                    </div>
                    <div className="p-5">
                      <p className="font-label-caps text-[10px] text-on-surface-variant mb-2">TOP TITLES</p>
                      <ul className="space-y-1.5">
                        {(ch.top_titles || []).slice(0, 4).map((title, i) => (
                          <li key={i} className="font-data-mono text-[11px] text-on-surface flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {title}
                          </li>
                        ))}
                      </ul>
                    </div>
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
