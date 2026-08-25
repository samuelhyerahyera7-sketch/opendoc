// Per-page SEO tags. React 19 hoists <title>/<meta>/<link> rendered
// anywhere in the tree into <head> automatically, so no extra library
// (react-helmet etc.) is needed. This covers what Google's own crawler
// picks up (it executes JS) — it does NOT help non-JS bots like WhatsApp,
// Slack, or Twitter's link-preview fetchers, which only read the raw HTML
// from index.html and never run React at all. That's a known, separate gap.
const SITE_URL = 'https://opendoc.co.za'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`

export default function Seo({
  title,
  description,
  path,
  image,
  jsonLd,
}: {
  title: string
  description: string
  path: string
  image?: string
  jsonLd?: object
}) {
  const url = `${SITE_URL}${path}`
  const fullTitle = title.includes('OpenDoc') ? title : `${title} | OpenDoc`

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="OpenDoc" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image || DEFAULT_IMAGE} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image || DEFAULT_IMAGE} />

      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </>
  )
}
