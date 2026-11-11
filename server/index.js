import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import session from 'express-session'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const publicDir = path.join(projectRoot, 'public')
const dataDir = path.join(__dirname, 'data')
const adminFile = path.join(dataDir, 'admin.json')

const PORT = Number(process.env.PORT || 4000)
const NODE_ENV = process.env.NODE_ENV || 'development'
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || ''
const SESSION_SECRET = process.env.SESSION_SECRET || ''
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true'
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 8)
const SESSION_MS = Math.max(1, SESSION_HOURS) * 60 * 60 * 1000
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000

if (!ADMIN_EMAIL) {
  console.error('[auth] ADMIN_EMAIL is missing. Add it to your .env file.')
  process.exit(1)
}
if (!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH) {
  console.error('[auth] Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH in your .env file.')
  process.exit(1)
}
if (!SESSION_SECRET) {
  console.error('[auth] SESSION_SECRET is missing. Add a long random string to your .env file.')
  process.exit(1)
}

const initialHash = ADMIN_PASSWORD_HASH || (ADMIN_PASSWORD ? bcrypt.hashSync(ADMIN_PASSWORD, 12) : '')

const readAdminRecord = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(adminFile, 'utf8'))
    if (parsed && parsed.email && parsed.passwordHash) return parsed
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[auth] Could not read admin store:', error.message)
  }
  return null
}

const writeAdminRecord = record => {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(adminFile, JSON.stringify(record, null, 2), { mode: 0o600 })
}

let adminRecord = readAdminRecord()
if (adminRecord) {
  console.log('[auth] Loaded hashed admin account from server/data/admin.json')
} else {
  adminRecord = {
    email: ADMIN_EMAIL,
    passwordHash: initialHash,
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: null,
  }
  writeAdminRecord(adminRecord)
  console.log('[auth] Seeded hashed admin account at server/data/admin.json')
}

const ADMIN_EMAIL_STORED = String(adminRecord.email || ADMIN_EMAIL).trim().toLowerCase()

const constantTimeEqual = (a, b) => {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

const verifyPassword = async candidate => {
  if (!candidate) return false
  return bcrypt.compare(String(candidate), adminRecord.passwordHash)
}

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use(express.json({ limit: '10kb' }))
app.use(session({
  name: 'verso_admin_sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: SESSION_MS,
  },
}))

const adminPayload = req => ({
  name: 'Admin',
  email: adminRecord.email,
  role: 'admin',
  at: req.session.admin.at,
  passwordUpdatedAt: adminRecord.updatedAt || null,
})

const requireAdmin = (req, res, next) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Administrator authentication required.' })
  }
  next()
}

const requireAdminPage = (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login')
  }
  next()
}

const loginAttempts = new Map()
const MAX_ATTEMPTS = 10
const ATTEMPT_WINDOW = 10 * 60 * 1000

const clientKey = req => req.ip || 'unknown'
const currentAttempts = key => {
  const record = loginAttempts.get(key)
  if (!record) return null
  if (Date.now() - record.first > ATTEMPT_WINDOW) {
    loginAttempts.delete(key)
    return null
  }
  return record
}
const registerFailure = key => {
  const record = currentAttempts(key)
  if (record) record.count += 1
  else loginAttempts.set(key, { first: Date.now(), count: 1 })
}

const loginLimiter = (req, res, next) => {
  const record = currentAttempts(clientKey(req))
  if (record && record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many sign-in attempts. Please try again in a few minutes.' })
  }
  next()
}

app.get('/api/admin/session', (req, res) => {
  if (!req.session.admin) return res.json({ authenticated: false })
  res.json({ authenticated: true, admin: adminPayload(req) })
})

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const remember = Boolean(req.body?.remember)

  if (!email || !password) {
    return res.status(400).json({ error: 'Enter your admin email and password.' })
  }

  const emailMatches = constantTimeEqual(email, ADMIN_EMAIL_STORED)
  const passwordMatches = await verifyPassword(password)

  if (!emailMatches || !passwordMatches) {
    registerFailure(clientKey(req))
    return res.status(401).json({ error: 'Incorrect admin credentials.' })
  }

  loginAttempts.delete(clientKey(req))

  req.session.regenerate(error => {
    if (error) return res.status(500).json({ error: 'Could not start a secure session.' })
    req.session.admin = { email: adminRecord.email, role: 'admin', at: Date.now() }
    req.session.cookie.maxAge = remember ? REMEMBER_MS : SESSION_MS
    req.session.save(saveError => {
      if (saveError) return res.status(500).json({ error: 'Could not save the session.' })
      res.json({ ok: true, admin: adminPayload(req) })
    })
  })
})

app.post('/api/admin/logout', (req, res) => {
  if (!req.session) return res.json({ ok: true })
  req.session.destroy(() => {
    res.clearCookie('verso_admin_sid')
    res.json({ ok: true })
  })
})

app.post('/api/admin/password', requireAdmin, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '')
  const newPassword = String(req.body?.newPassword || '')

  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'Use 8+ characters with at least one letter and one number.' })
  }

  if (!(await verifyPassword(currentPassword))) {
    return res.status(401).json({ error: 'Current password is incorrect.' })
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  adminRecord = {
    ...adminRecord,
    passwordHash,
    updatedAt: new Date().toISOString(),
  }
  writeAdminRecord(adminRecord)
  res.json({ ok: true, updatedAt: adminRecord.updatedAt })
})

app.post('/api/admin/password/reset', requireAdmin, (req, res) => {
  adminRecord = {
    ...adminRecord,
    passwordHash: initialHash,
    updatedAt: null,
  }
  writeAdminRecord(adminRecord)
  res.json({ ok: true })
})

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }))

const loginFile = fs.existsSync(path.join(distDir, 'login.html'))
  ? path.join(distDir, 'login.html')
  : path.join(publicDir, 'login.html')
const appFile = path.join(distDir, 'index.html')

app.get('/', (req, res) => res.redirect('/admin/dashboard'))

app.get(['/admin/login', '/login.html'], (req, res) => {
  if (req.session.admin) return res.redirect('/admin/dashboard')
  res.sendFile(loginFile)
})

app.get(['/admin', '/admin/dashboard', '/index.html'], requireAdminPage, (req, res) => {
  res.sendFile(appFile)
})

app.use(express.static(distDir, { index: false }))

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  if (req.path.startsWith('/api/')) return next()
  if (path.extname(req.path)) return res.status(404).send('Not found')
  if (req.path.startsWith('/admin')) return res.redirect('/admin/dashboard')
  res.redirect('/admin/dashboard')
})

app.use((error, req, res, next) => {
  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload.' })
  }
  console.error('[server] Unhandled error:', error)
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Server error.' })
  res.status(500).send('Server error')
})

app.listen(PORT, () => {
  console.log(`[server] VERSO Coffee admin server running on http://localhost:${PORT} (${NODE_ENV})`)
  console.log(`[server] Admin email: ${ADMIN_EMAIL_STORED}`)
  console.log('[server] Admin password: stored as a bcrypt hash in server/data/admin.json')
})
