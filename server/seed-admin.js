import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const adminFile = path.join(dataDir, 'admin.json')

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD || ''
const passwordHash = process.env.ADMIN_PASSWORD_HASH || ''

if (!email) {
  console.error('ADMIN_EMAIL is missing. Add it to your .env file.')
  process.exit(1)
}
if (!password && !passwordHash) {
  console.error('Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH in your .env file.')
  process.exit(1)
}
if (password && (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
  console.error('ADMIN_PASSWORD must use 8+ characters with at least one letter and one number.')
  process.exit(1)
}

const record = {
  email,
  passwordHash: passwordHash || bcrypt.hashSync(password, 12),
  role: 'admin',
  createdAt: new Date().toISOString(),
  updatedAt: null,
}

fs.mkdirSync(dataDir, { recursive: true })
fs.writeFileSync(adminFile, JSON.stringify(record, null, 2), { mode: 0o600 })
console.log('[seed] Admin account written to server/data/admin.json')
console.log('[seed] Email:', email)
