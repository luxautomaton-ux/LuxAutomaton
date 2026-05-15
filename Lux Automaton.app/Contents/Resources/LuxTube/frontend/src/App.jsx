import React, { useState } from 'react'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import ViralScannerPage from './pages/ViralScannerPage'
import ShortsPlannerPage from './pages/ShortsPlannerPage'
import LongformPlannerPage from './pages/LongformPlannerPage'
import AIModelsPage from './pages/AIModelsPage'
import HeyGenConfigPage from './pages/HeyGenConfigPage'
import SkillsProfilePage from './pages/SkillsProfilePage'
import VideoGeneratorPage from './pages/VideoGeneratorPage'
import GuidePage from './pages/GuidePage'
import AutopilotPage from './pages/AutopilotPage'

const pageComponents = {
  dashboard: DashboardPage,
  scanner: ViralScannerPage,
  shorts: ShortsPlannerPage,
  longform: LongformPlannerPage,
  models: AIModelsPage,
  heygen: HeyGenConfigPage,
  skills: SkillsProfilePage,
  video: VideoGeneratorPage,
  autopilot: AutopilotPage,
  guide: GuidePage,
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const PageComponent = pageComponents[activePage] || DashboardPage

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      <PageComponent />
    </Layout>
  )
}
