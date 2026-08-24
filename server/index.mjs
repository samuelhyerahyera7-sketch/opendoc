import 'dotenv/config'
import app from './app.mjs'

const PORT = process.env.PORT || 5175
app.listen(PORT, () => {
  console.log(`OpenDoc API listening on http://localhost:${PORT}`)
})
