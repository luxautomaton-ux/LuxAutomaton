import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

const defaultProfile = { niche: '', voice: '', goal: '', cta: '' }

export default function SkillsProfilePage() {
  const [profile, setProfile] = useState(defaultProfile)
  const [skills, setSkills] = useState([])
  const [customRepo, setCustomRepo] = useState('')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true); setError('')
    try {
      const [profRes, skillsRes] = await Promise.all([
        api('/api/agent/profile'),
        api('/api/skills/list'),
      ])
      if (profRes?.profile) setProfile({ ...defaultProfile, ...profRes.profile })
      setSkills(Array.isArray(skillsRes?.skills) ? skillsRes.skills : [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function saveProfile() {
    setLoading(true); setError(''); setNotice('')
    try {
      const data = await api('/api/agent/profile', { method: 'POST', body: JSON.stringify({ profile }) })
      if (data?.profile) setProfile({ ...defaultProfile, ...data.profile })
      setNotice(data.message || 'Profile saved.')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function installSafePack() {
    setLoading(true); setError(''); setNotice('')
    try {
      const data = await api('/api/skills/install-safe-pack', { method: 'POST' })
      setSkills(Array.isArray(data?.skills) ? data.skills : [])
      setNotice('Safe skill pack installed.')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function installCustom() {
    if (!customRepo.trim()) { setError('Enter a skill name or repo.'); return }
    setLoading(true); setError(''); setNotice('')
    try {
      const data = await api('/api/skills/install', { method: 'POST', body: JSON.stringify({ repository: customRepo.trim() }) })
      setNotice(data.message || 'Skill installed.')
      setCustomRepo('')
      await loadAll()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Skills + Channel Profile</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Control positioning and skill behavior before generation.</p>
      </div>

      {error && <div className="bg-error-container/20 border border-error/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-error">{error}</div>}
      {notice && <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-xl px-5 py-3 font-data-mono text-[13px] text-[#39FF14]">{notice}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Profile */}
        <div className="xl:col-span-5">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden h-full">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30 flex justify-between items-center">
              <h2 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">person</span> CHANNEL PROFILE
              </h2>
              <button onClick={saveProfile} disabled={loading} className="bg-inverse-primary text-white font-label-caps text-[10px] px-4 py-1.5 rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1.5 disabled:opacity-50">
                <span className="material-symbols-outlined text-[14px]">save</span> SAVE
              </button>
            </div>
            <div className="p-5 space-y-4">
              {Object.entries(profile).map(([key, value]) => (
                <div key={key}>
                  <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1.5 uppercase">{key}</label>
                  <input
                    value={value}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-data-mono text-data-mono p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="xl:col-span-7">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-surface-container-high/30 flex justify-between items-center">
              <h2 className="font-label-caps text-label-caps text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">extension</span> INSTALLED SKILLS
              </h2>
              <span className="font-data-mono text-[11px] text-on-surface-variant">{skills.length} INSTALLED</span>
            </div>
            <div className="p-5">
              {skills.length === 0 && !loading ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-[40px] text-on-surface-variant opacity-30">extension_off</span>
                  <p className="font-data-mono text-data-mono text-on-surface-variant mt-2">No skills installed yet</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mb-5">
                  {skills.map((skill) => (
                    <span key={skill} className="bg-primary-container/10 border border-primary-container/20 text-primary font-data-mono text-[11px] px-3 py-1.5 rounded-lg">{skill}</span>
                  ))}
                </div>
              )}

              {/* Custom install */}
              <div className="flex gap-3 mb-4">
                <input
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                  placeholder="owner/repo or skill-name"
                  className="flex-1 bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-data-mono text-data-mono p-3 rounded-xl focus:border-primary outline-none transition-colors"
                />
                <button onClick={installCustom} disabled={loading} className="bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-label-caps text-[11px] px-5 py-3 rounded-xl hover:border-outline-variant/40 transition-colors disabled:opacity-50">
                  ADD SKILL
                </button>
              </div>

              <button onClick={installSafePack} disabled={loading} className="w-full bg-primary-container/20 border border-primary-container/30 text-primary font-label-caps text-[11px] px-4 py-3 rounded-xl hover:bg-primary-container/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-[16px]">download</span> INSTALL SAFE SKILL PACK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
