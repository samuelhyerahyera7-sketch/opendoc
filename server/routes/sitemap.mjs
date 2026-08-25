import { Router } from 'express'
import pool from '../db.mjs'
import { slugifyMedicalAid } from '../medicalAidSlugs.mjs'

const router = Router()
const SITE_URL = 'https://opendoc.co.za'

const STATIC_PATHS = ['/', '/search', '/medical-aid', '/medical-aid/cash', '/for-providers', '/privacy', '/terms']

router.get('/sitemap.xml', async (req, res) => {
  const { rows: doctors } = await pool.query(
    "SELECT id, created_at FROM doctors WHERE verification_status != 'rejected'",
  )
  const { rows: insuranceRows } = await pool.query(
    'SELECT DISTINCT insurance FROM doctor_insurances',
  )

  const urls = [
    ...STATIC_PATHS.map((p) => ({ loc: `${SITE_URL}${p}`, priority: p === '/' ? '1.0' : '0.8' })),
    ...insuranceRows.map((r) => ({
      loc: `${SITE_URL}/medical-aid/${slugifyMedicalAid(r.insurance)}`,
      priority: '0.7',
    })),
    ...doctors.map((d) => ({
      loc: `${SITE_URL}/doctor/${d.id}`,
      lastmod: d.created_at ? new Date(d.created_at).toISOString() : undefined,
      priority: '0.6',
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml')
  res.send(xml)
})

export default router
