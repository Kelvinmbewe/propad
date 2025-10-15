import { useEffect } from 'react'
import { Link, Route, Routes } from 'react-router-dom'

import { AgentPage } from './pages/AgentPage'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'

const injectAdsScript = () => {
  const id = 'adsense-script'
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
  script.crossOrigin = 'anonymous'
  script.setAttribute('data-ad-client', import.meta.env.VITE_GOOGLE_ADS_CLIENT ?? 'ca-pub-xxxxxxxxxxxx')
  document.body.appendChild(script)
}

const Footer = () => (
  <footer className="mt-16 bg-slate-900 py-12 text-slate-200">
    <div className="mx-auto flex w-11/12 max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-lg font-semibold">PropAd Zimbabwe</h3>
        <p className="text-sm text-slate-400">Free to browse · Verified listings · Agents paid by PropAd</p>
      </div>
      <div className="space-y-2 text-sm text-slate-400">
        <p>Whatsapp hotline: <a className="text-white" href="https://wa.me/263771234567" target="_blank" rel="noreferrer">+263 77 123 4567</a></p>
        <p>Email: hello@propad.co.zw</p>
      </div>
    </div>
  </footer>
)

const App = () => {
  useEffect(() => {
    injectAdsScript()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-11/12 max-w-6xl items-center justify-between py-4">
          <Link to="/" className="text-xl font-bold text-brand-primary">
            PropAd Zimbabwe
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/agents" className="hover:text-brand-primary">
              Agents
            </Link>
            <Link to="/admin" className="hover:text-brand-primary">
              Admin
            </Link>
            <a href="https://propad.co.zw/blog" className="hover:text-brand-primary" target="_blank" rel="noreferrer">
              Updates
            </a>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/agents" element={<AgentPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>

      <Footer />
    </div>
  )
}

export default App
