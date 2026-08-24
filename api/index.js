// Vercel serverless entry point. Vercel's plain (non-framework) filesystem
// routing only maps a bracketed filename to a single path segment — it's
// not a true multi-segment catch-all — so every request under /api/* is
// explicitly rewritten to this one function in vercel.json. Express's
// request handler signature (req, res) is exactly what Vercel's Node
// runtime expects, so no adapter is needed; Express routes off req.url as
// usual regardless of how the request was rewritten here.
import app from '../server/app.mjs'

export default app
