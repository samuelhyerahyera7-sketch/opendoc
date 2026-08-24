// Vercel serverless entry point. This catch-all file handles every request
// under /api/* with the same Express app used for local dev — Express's
// request handler signature (req, res) is exactly what Vercel's Node
// runtime expects, so no adapter is needed.
import app from '../server/app.mjs'

export default app
