import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import DoctorProfile from './pages/DoctorProfile'
import Booking from './pages/Booking'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForProviders from './pages/ForProviders'

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
      <ScrollToTop />
      <Header />
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/doctor/:id" element={<DoctorProfile />} />
          <Route path="/booking/:id" element={<Booking />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/for-providers" element={<ForProviders />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}

export default App
