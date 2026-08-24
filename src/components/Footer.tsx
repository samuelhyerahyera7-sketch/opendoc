import { Link } from 'react-router-dom'
import { specialtyIcons } from '../data/staticData'

const specialties = Object.keys(specialtyIcons).map((name) => ({ name }))

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-100 bg-ink-950 text-ink-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
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
              <li><a href="#" className="hover:text-white">Practice Resources</a></li>
              <li><a href="#" className="hover:text-white">Provider Login</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="hover:text-white">Help Center</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
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
