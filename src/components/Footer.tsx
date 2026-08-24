import { Link } from 'react-router-dom'
import { footerMedicalAids, specialtyIcons } from '../data/staticData'
import { slugifyMedicalAid } from '../data/medicalAids'

const specialties = Object.keys(specialtyIcons).map((name) => ({ name }))

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-100 bg-ink-950 text-ink-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Medical Aid</h4>
            <ul className="space-y-2.5 text-sm">
              {footerMedicalAids.map((name) => (
                <li key={name}>
                  <Link to={`/medical-aid/${slugifyMedicalAid(name)}`} className="hover:text-white">
                    {name.replace(/ (Medical (Scheme|Fund)|Health)$/, '')}
                  </Link>
                </li>
              ))}
              <li><Link to="/medical-aid" className="font-semibold text-brand-300 hover:text-white">All schemes &rarr;</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Top Specialties</h4>
            <ul className="space-y-2.5 text-sm">
              {specialties.slice(0, 6).map((s) => (
                <li key={s.name}>
                  <Link to={`/search?q=${encodeURIComponent(s.name)}`} className="hover:text-white">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="hover:text-white">About Us</a></li>
              <li><a href="#" className="hover:text-white">Careers</a></li>
              <li><a href="#" className="hover:text-white">Press</a></li>
              <li><a href="#" className="hover:text-white">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">For Providers</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/for-providers" className="hover:text-white">List Your Practice</Link></li>
              <li><Link to="/provider/login" className="hover:text-white">Provider Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-ink-800 pt-8 text-sm sm:flex-row">
          <p>&copy; {new Date().getFullYear()} OpenDoc. All rights reserved.</p>
          <p className="text-ink-400">Not affiliated with Zocdoc. Design demo only.</p>
        </div>
      </div>
    </footer>
  )
}
