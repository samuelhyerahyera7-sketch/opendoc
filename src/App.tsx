import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import DoctorProfile from './pages/DoctorProfile'
import Booking from './pages/Booking'
import ReviewPage from './pages/ReviewPage'
import MedicalAidHub from './pages/MedicalAidHub'
import MedicalAidSchemePage from './pages/MedicalAidSchemePage'
import DoctorsDirectory from './pages/DoctorsDirectory'
import SpecialtyCityPage from './pages/SpecialtyCityPage'
import ForProviders from './pages/ForProviders'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import AdminDashboard from './pages/AdminDashboard'
import ProviderSignup from './pages/provider/ProviderSignup'
import ProviderLogin from './pages/provider/ProviderLogin'
import ProviderDashboard from './pages/provider/ProviderDashboard'
import ForgotPassword from './pages/provider/ForgotPassword'
import ResetPassword from './pages/provider/ResetPassword'
import VerifyEmail from './pages/provider/VerifyEmail'
import { DoctorAuthProvider } from './context/DoctorAuthContext'
import { PatientAuthProvider } from './context/PatientAuthContext'
import PatientSignup from './pages/patient/PatientSignup'
import PatientLogin from './pages/patient/PatientLogin'
import PatientDashboard from './pages/patient/PatientDashboard'
import PatientForgotPassword from './pages/patient/PatientForgotPassword'
import PatientResetPassword from './pages/patient/PatientResetPassword'
import PatientVerifyEmail from './pages/patient/PatientVerifyEmail'

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
        <PatientAuthProvider>
          <ScrollToTop />
          <Header />
          <main className="flex flex-1 flex-col">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/doctor/:id" element={<DoctorProfile />} />
              <Route path="/booking/:id" element={<Booking />} />
              <Route path="/review/:token" element={<ReviewPage />} />
              <Route path="/medical-aid" element={<MedicalAidHub />} />
              <Route path="/medical-aid/:slug" element={<MedicalAidSchemePage />} />
              <Route path="/doctors" element={<DoctorsDirectory />} />
              <Route path="/doctors/:specialtySlug/:citySlug" element={<SpecialtyCityPage />} />
              <Route path="/for-providers" element={<ForProviders />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/provider/signup" element={<ProviderSignup />} />
              <Route path="/provider/login" element={<ProviderLogin />} />
              <Route path="/provider/forgot-password" element={<ForgotPassword />} />
              <Route path="/provider/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/provider/dashboard" element={<ProviderDashboard />} />
              <Route path="/patient/signup" element={<PatientSignup />} />
              <Route path="/patient/login" element={<PatientLogin />} />
              <Route path="/patient/forgot-password" element={<PatientForgotPassword />} />
              <Route path="/patient/reset-password" element={<PatientResetPassword />} />
              <Route path="/patient/verify-email" element={<PatientVerifyEmail />} />
              <Route path="/patient/dashboard" element={<PatientDashboard />} />
            </Routes>
          </main>
          <Footer />
        </PatientAuthProvider>
      </DoctorAuthProvider>
    </BrowserRouter>
  )
}

export default App
