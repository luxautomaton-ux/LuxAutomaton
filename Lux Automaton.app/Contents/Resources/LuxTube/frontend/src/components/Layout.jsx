import React, { useState } from 'react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'analytics' },
  { id: 'autopilot', label: 'Autopilot', icon: 'route' },
  { id: 'scanner', label: 'Viral Scanner', icon: 'rocket_launch' },
  { id: 'shorts', label: 'Shorts Planner', icon: 'vertical_split' },
  { id: 'longform', label: 'Long-form Planner', icon: 'movie' },
  { id: 'models', label: 'AI Models', icon: 'smart_toy' },
  { id: 'heygen', label: 'HeyGen Config', icon: 'settings_input_component' },
  { id: 'skills', label: 'Skills + Profile', icon: 'school' },
  { id: 'video', label: 'Video Generator', icon: 'videocam' },
  { id: 'guide', label: 'Guide', icon: 'help' },
]

const mobileNavItems = [
  { id: 'dashboard', label: 'Studio', icon: 'dashboard' },
  { id: 'autopilot', label: 'Autopilot', icon: 'route' },
  { id: 'scanner', label: 'Scanner', icon: 'troubleshoot' },
  { id: 'shorts', label: 'Planner', icon: 'calendar_view_day' },
  { id: 'models', label: 'AI Lab', icon: 'memory' },
  { id: 'video', label: 'Video', icon: 'videocam' },
]

export default function Layout({ activePage, setActivePage, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="bg-background text-on-surface font-body-md text-body-md min-h-screen antialiased flex flex-col">
      {/* ── NavigationDrawer (Desktop Sidebar) ── */}
      <nav className="h-full w-[280px] fixed left-0 top-0 bg-surface-container border-r border-outline-variant/40 hidden lg:flex flex-col p-5 z-50">
        {/* Header Profile */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-outline-variant/30">
          <div className="w-11 h-11 rounded-xl bg-inverse-primary flex items-center justify-center shadow-glow-red">
            <span className="material-symbols-outlined text-white icon-fill text-[22px]">sensors</span>
          </div>
          <div>
            <div className="font-headline-sm text-[16px] text-on-surface font-bold tracking-tight leading-tight">Command Center</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-glow-green"></span>
              <span className="font-data-mono text-[10px] text-[#39FF14] tracking-wider">SYSTEM READY</span>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 ease-out text-left w-full group ${
                activePage === item.id
                  ? 'bg-primary-container text-on-primary-container shadow-glow-red'
                  : 'text-on-surface/80 hover:bg-surface-variant/60 hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${activePage === item.id ? 'icon-fill scale-110' : 'group-hover:scale-105'}`}>
                {item.icon}
              </span>
              <span className={`text-[13px] tracking-wide ${activePage === item.id ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-outline-variant/30">
          <div className="text-data-mono font-data-mono text-on-surface-variant/40 text-center text-[11px]">v2.4.1.9</div>
        </div>
      </nav>

      {/* ── TopAppBar ── */}
      <header className="bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 fixed top-0 w-full lg:w-[calc(100%-280px)] lg:ml-[280px] flex items-center justify-between px-margin-mobile md:px-6 h-16 z-40">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden text-primary active:scale-95 duration-100 hover:bg-surface-container-highest/60 transition-colors p-2 rounded-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined icon-fill text-primary text-[22px]">sensors</span>
            <h1 className="font-display-lg text-[20px] uppercase tracking-tighter text-on-surface font-extrabold">
              LUX <span className="text-inverse-primary">TUBE</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-surface-container/80 border border-outline-variant/30 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-glow-green animate-pulse"></span>
            <span className="font-data-mono text-[11px] text-on-surface/70 tracking-wider">SYS.OPT</span>
          </div>
          {/* Notifications */}
          <button className="w-9 h-9 rounded-xl bg-surface-variant/40 flex items-center justify-center hover:bg-surface-variant/70 transition-colors active:scale-95">
            <span className="material-symbols-outlined text-[18px] text-on-surface/60">notifications</span>
          </button>
          {/* Avatar */}
          <button className="w-9 h-9 rounded-xl bg-surface-variant border border-outline-variant/40 flex items-center justify-center hover:bg-surface-container-highest transition-colors active:scale-95 overflow-hidden">
            <span className="material-symbols-outlined text-[18px] text-on-surface/60">person</span>
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <nav
            className="absolute left-0 top-0 h-full w-[280px] bg-surface-container p-5 flex flex-col gap-1 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-outline-variant/30">
              <div className="w-11 h-11 rounded-xl bg-inverse-primary flex items-center justify-center shadow-glow-red">
                <span className="material-symbols-outlined text-white icon-fill">sensors</span>
              </div>
              <div>
                <div className="font-headline-sm text-[16px] text-on-surface font-bold tracking-tight">Command Center</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-glow-green"></span>
                  <span className="font-data-mono text-[10px] text-[#39FF14]">SYSTEM READY</span>
                </div>
              </div>
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left w-full ${
                  activePage === item.id
                    ? 'bg-primary-container text-on-primary-container shadow-glow-red'
                    : 'text-on-surface/80 hover:bg-surface-variant/60'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${activePage === item.id ? 'icon-fill' : ''}`}>{item.icon}</span>
                <span className={`text-[13px] ${activePage === item.id ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <main className="flex-1 lg:ml-[280px] mt-16 p-4 md:p-6 bg-background overflow-y-auto min-h-[calc(100vh-4rem)] pb-20 md:pb-6">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>

      {/* ── BottomNavBar (Mobile Only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center py-2.5 bg-surface-dim/95 backdrop-blur-md border-t border-outline-variant/30 z-50">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${
              activePage === item.id
                ? 'text-primary font-bold'
                : 'text-secondary/60 hover:text-primary'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activePage === item.id ? 'icon-fill' : ''}`}>
              {item.icon}
            </span>
            <span className="font-label-caps text-[10px] mt-0.5">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
