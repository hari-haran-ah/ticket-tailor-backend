import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ClientsPage from './pages/clients/ClientsPage'
import NewClientPage from './pages/clients/NewClientPage'
import EditClientPage from './pages/clients/EditClientPage'
import ViewClientPage from './pages/clients/ViewClientPage'
import EventsPage from './pages/events/EventsPage'
import EventDetailsPage from './pages/events/EventDetailsPage'
import NewEventPage from './pages/events/NewEventPage'
import AnalysisPage from './pages/analysis/AnalysisPage'
import PaymentsPage from './pages/payments/PaymentsPage'

function PrivateRoute({ children }) {
  const { admin, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-black dark:border-white" />
      </div>
    )
  }
  return admin ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { admin } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={admin ? <Navigate to="/clients" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/clients" replace />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/new" element={<NewClientPage />} />
                <Route path="/clients/:clientId/edit" element={<EditClientPage />} />
                <Route path="/clients/:clientId/view" element={<ViewClientPage />} />
                <Route path="/events/:clientId?" element={<EventsPage />} />
                <Route path="/events/:clientId/new" element={<NewEventPage />} />
                <Route path="/events/:clientId/:eventId/view" element={<EventDetailsPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
