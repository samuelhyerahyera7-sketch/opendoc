import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import DoctorProfile from './pages/DoctorProfile'
import Booking from './pages/Booking'
import ForProviders from './pages/ForProviders'
import ProviderSignup from './pages/provider/ProviderSignup'
import ProviderLogin from './pages/provider/ProviderLogin'
import ProviderDashboard from './pages/provider/ProviderDashboard'
import { DoctorAuthProvider } from './context/DoctorAuthContext'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <DoctorAuthProvider>
        <ScrollToTop />
        <Header />
        <main className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/doctor/:id" element={<DoctorProfile />} />
            <Route path="/booking/:id" element={<Booking />} />
            <Route path="/for-providers" element={<ForProviders />} />
            <Route path="/provider/signup" element={<ProviderSignup />} />
            <Route path="/provider/login" element={<ProviderLogin />} />
            <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          </Routes>
        </main>
        <Footer />
      </DoctorAuthProvider>
    </BrowserRouter>
  )
}

export default App
