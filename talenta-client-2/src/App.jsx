import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Ticket } from 'lucide-react'
import HomePage from './pages/HomePage'
import EventDetailPage from './pages/EventDetailPage'
import CheckoutPage from './pages/CheckoutPage'
import CheckoutSuccessPage from './pages/CheckoutSuccessPage'
import CheckoutCancelPage from './pages/CheckoutCancelPage'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Navbar() {
  const [clientName, setClientName] = useState('')
  const location = useLocation()

  useEffect(() => {
    axios.get(`${API}/api/site/events`)
      .then(({ data }) => {
        if (data.client_name) setClientName(data.client_name)
      })
      .catch(() => { })
  }, [])

  return (
    <nav className="navbar">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-shadow"
            style={{ backgroundColor: `rgb(var(--brand-r), var(--brand-g), var(--brand-b))` }}
          >
            <Ticket size={16} style={{ color: 'var(--app-bg)' }} />
          </div>
          <span className="font-extrabold text-lg tracking-tight transition-all duration-300" style={{ color: 'var(--app-text)' }}>
            {clientName || '\u00A0'}
          </span>
        </Link>

        <div className="flex items-center gap-5">
          <Link
            to="/"
            className="text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{ color: location.pathname === '/' ? `rgb(var(--brand-r), var(--brand-g), var(--brand-b))` : 'var(--app-text-muted)' }}
          >
            Events
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="py-10 px-4 mt-auto" style={{ borderTop: '1px solid var(--app-border)' }}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: `rgb(var(--brand-r), var(--brand-g), var(--brand-b), 0.8)` }}>
            <Ticket size={10} style={{ color: 'var(--app-bg)' }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--app-text-faint)' }}>Powered by Talenta</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--app-text-faint)' }}>
          &copy; {new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--app-bg)' }}>
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
            <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
