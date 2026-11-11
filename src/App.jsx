import { useEffect, useMemo, useRef, useState } from 'react'
import AOS from 'aos'
import {
  Search, Bell, Menu, X, LogOut, Check, ArrowUpRight, ArrowRight, TrendingUp,
  CircleDollarSign, ShoppingBag, ShoppingCart, CheckCircle2, Clock, MapPin,
  CalendarDays, RefreshCw, Star, Store, PauseCircle, PlayCircle, Save,
  ChevronDown, Sparkles, Leaf, Coffee, Users, Snowflake, UserRound,
  ImagePlus, Upload, RotateCcw, Pencil, ShieldCheck, KeyRound, BadgeCheck,
  AtSign, Lock, Phone, Briefcase, Eye, EyeOff, Mail, Tags, CreditCard,
  Trash2, Plus, XCircle, Banknote, Wallet, Package, Download, BarChart3,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  nav, API, HOUSE_MENU, FALLBACK_MENU, FALLBACK_IMAGE, defaultSettings,
  defaultCategories,
} from './data'

const ORDERS_KEY = 'verso_coffee_orders'
const ACCOUNTS_KEY = 'verso_coffee_accounts'
const SETTINGS_KEY = 'verso_coffee_settings'
const SOLD_OUT_KEY = 'verso_coffee_sold_out'
const PHOTOS_KEY = 'verso_coffee_photos'
const PRODUCTS_KEY = 'verso_coffee_products'
const CATEGORIES_KEY = 'verso_coffee_categories'
const PROFILE_KEY = 'verso_admin_profile'
const SECURITY_KEY = 'verso_admin_security'

const readJSON = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return value == null ? fallback : value
  } catch (error) {
    return fallback
  }
}

const readOrders = () => {
  const stored = readJSON(ORDERS_KEY, [])
  if (!Array.isArray(stored)) return []
  return stored
    .filter(order => order && order.id)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

const writeOrders = orders => {
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)) } catch (error) {}
}

const readAccounts = () => {
  const stored = readJSON(ACCOUNTS_KEY, [])
  return Array.isArray(stored) ? stored.filter(account => account && account.email) : []
}

const readSettings = () => {
  const stored = readJSON(SETTINGS_KEY, {})
  return { ...defaultSettings, ...(stored && typeof stored === 'object' ? stored : {}) }
}

const readSoldOut = () => {
  const stored = readJSON(SOLD_OUT_KEY, [])
  return new Set(Array.isArray(stored) ? stored : [])
}

const readPhotos = () => {
  const stored = readJSON(PHOTOS_KEY, {})
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
}

const readProducts = () => {
  const stored = readJSON(PRODUCTS_KEY, [])
  return Array.isArray(stored) ? stored.filter(product => product && product.id) : []
}

const readCategories = () => {
  const stored = readJSON(CATEGORIES_KEY, null)
  if (Array.isArray(stored) && stored.length) return stored.filter(item => item && item.name)
  return defaultCategories
}

const writeProducts = products => {
  try { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products)) } catch (error) {}
}

const writeCategories = categories => {
  try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories)) } catch (error) {}
}

const STATUS_META = {
  new: { label: 'New', tone: 'new' },
  preparing: { label: 'Preparing', tone: 'prep' },
  ready: { label: 'Ready', tone: 'ready' },
  completed: { label: 'Completed', tone: 'good' },
  cancelled: { label: 'Cancelled', tone: 'cancelled' },
}

const LOGIN_PATH = import.meta.env.DEV ? '/login.html' : '/admin/login'

const orderStatus = order => (
  STATUS_META[order?.status] ? order.status : order?.completed ? 'completed' : 'new'
)
const isComplete = order => orderStatus(order) === 'completed'
const isCancelled = order => orderStatus(order) === 'cancelled'
const isOpenOrder = order => !isComplete(order) && !isCancelled(order)

const defaultProfile = {
  name: 'Admin',
  email: 'admin@coffee.com',
  title: 'Store manager',
  phone: '+855 12 345 678',
  location: 'Street 240, Phnom Penh',
  bio: 'Running the VERSO counter, one perfect shot at a time.',
}

const readProfile = session => {
  const stored = readJSON(PROFILE_KEY, null)
  const saved = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  return {
    ...defaultProfile,
    name: session?.name || defaultProfile.name,
    email: session?.email || defaultProfile.email,
    joined: saved.joined || (session?.at ? new Date(session.at).toISOString() : null),
    ...saved,
  }
}

const readSecurity = () => {
  const stored = readJSON(SECURITY_KEY, null)
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
}

const formatJoined = value => {
  if (!value) return 'Member since 2024'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Member since 2024'
  return 'Member since ' + date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const storedPhoto = (photos, id) => (
  photos[id] || photos[String(id).replace(/-\d+$/, '')] || ''
)

const BROKEN_PHOTO = /example\.com|^http:\/\/x\/|sdsda|ColdBrewCoffeein_Cans/i

const usablePhoto = value => {
  const url = typeof value === 'string' ? value.trim() : ''
  if (!/^https?:\/\//i.test(url)) return false
  if (BROKEN_PHOTO.test(url)) return false
  return true
}

const readImageFile = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('Could not read that image'))
  reader.onload = () => {
    const image = new Image()
    image.onerror = () => reject(new Error('Could not open that image'))
    image.onload = () => {
      const maxSize = 560
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.68))
    }
    image.src = reader.result
  }
  reader.readAsDataURL(file)
})

const money = value => `$${Number(value || 0).toFixed(2)}`
const orderItems = order => (Array.isArray(order?.items) ? order.items : [])
const orderUnits = order => orderItems(order).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
const sameDay = (value, compare = new Date()) => {
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toDateString() === compare.toDateString()
}
const orderTime = value => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  if (sameDay(value)) {
    return `Today, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const shortDate = value => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'First order pending'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const normalizeDrink = (item, category, index) => {
  const numericId = Number(item.id)
  const seed = Number.isFinite(numericId) && numericId > 0 ? numericId : index + 1
  const price = category === 'Hot'
    ? 3.25 + (seed % 5) * 0.45
    : 3.75 + (seed % 4) * 0.5
  const matchedPhoto = FALLBACK_MENU.find(
    entry => entry.title.toLowerCase() === String(item.title || '').toLowerCase(),
  )?.image
  const photo = matchedPhoto || FALLBACK_MENU[index % FALLBACK_MENU.length]?.image || FALLBACK_IMAGE
  return {
    id: category.toLowerCase() + '-' + (item.id != null ? item.id : seed) + '-' + (index + 1),
    title: item.title || 'House coffee',
    description: item.description || 'Brewed fresh to order.',
    ingredients: Array.isArray(item.ingredients) ? item.ingredients.filter(Boolean) : [],
    image: usablePhoto(item.image) ? item.image : photo,
    fallbackImage: photo,
    category,
    price: Math.round(price * 100) / 100,
    signature: seed % 7 === 0,
  }
}

const pageFromHash = () => {
  const hash = window.location.hash.slice(1).toLowerCase()
  return nav.find(item => item.label.toLowerCase() === hash)?.label ?? 'Dashboard'
}

const overviewMeta = {
  Dashboard: ['Dashboard', 'Revenue, orders and the health of the shop at a glance.'],
  Products: ['Products', 'Add, edit and manage every drink on the menu.'],
  Categories: ['Categories', 'Group the menu so customers can browse quickly.'],
  Orders: ['Orders', 'Every pickup, from new to completed.'],
  Customers: ['Customers', 'The people who keep the counter busy.'],
  Payments: ['Payments', 'Track paid, pending and cancelled order value.'],
  Reports: ['Reports', 'A clearer read on sales, drinks and habits.'],
  Profile: ['Profile', 'Your account, security and recent activity.'],
  Settings: ['Settings', 'Store details and how ordering works.'],
}

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [active, setActive] = useState(pageFromHash)
  const [orders, setOrders] = useState(readOrders)
  const [accounts, setAccounts] = useState(readAccounts)
  const [menu, setMenu] = useState([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuSource, setMenuSource] = useState('loading')
  const [menuError, setMenuError] = useState('')
  const [products, setProducts] = useState(readProducts)
  const [categories, setCategories] = useState(readCategories)
  const [soldOut, setSoldOut] = useState(readSoldOut)
  const [photos, setPhotos] = useState(readPhotos)
  const [settings, setSettings] = useState(readSettings)
  const [profile, setProfile] = useState(() => readProfile(session))
  const [security, setSecurity] = useState(readSecurity)
  const [search, setSearch] = useState('')
  const [orderFilter, setOrderFilter] = useState('All')
  const [menuFilter, setMenuFilter] = useState('All')
  const [salesRange, setSalesRange] = useState('7 days')
  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef(null)

  const userName = profile.name || 'Admin'
  const firstName = userName.split(/\s+/)[0] || 'Admin'
  const userInitial = userName.charAt(0).toUpperCase()

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const notify = message => {
    setNotice(message)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3200)
  }

  const logout = async () => {
    try { await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }) } catch (error) {}
    try { localStorage.removeItem('verso_session') } catch (error) {}
    window.location.assign(LOGIN_PATH)
  }

  useEffect(() => {
    let cancelled = false
    const verifySession = async () => {
      try {
        const response = await fetch('/api/admin/session', { credentials: 'include', cache: 'no-store' })
        if (!response.ok) throw new Error('unauthenticated')
        const data = await response.json()
        if (cancelled) return
        if (!data.authenticated) {
          window.location.replace(LOGIN_PATH)
          return
        }
        setSession({
          name: data.admin?.name || 'Admin',
          email: data.admin?.email || defaultProfile.email,
          role: 'admin',
          mode: 'login',
          at: data.admin?.at || Date.now(),
        })
        setAuthReady(true)
      } catch (error) {
        if (!cancelled) window.location.replace(LOGIN_PATH)
      }
    }
    verifySession()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    AOS.init({ duration: 750, easing: 'ease-out-cubic', once: true, offset: 35, delay: 40 })
    return () => AOS.refreshHard()
  }, [])

  useEffect(() => {
    AOS.refreshHard()
  }, [active, orders.length, menu.length, accounts.length])

  useEffect(() => {
    window.history.replaceState(null, '', `#${active.toLowerCase()}`)
    setSearch('')
    setMobileNav(false)
  }, [active])

  useEffect(() => {
    const syncFromHash = () => setActive(pageFromHash())
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  useEffect(() => {
    const refresh = () => {
      setOrders(readOrders())
      setAccounts(readAccounts())
      setPhotos(readPhotos())
    }
    const refreshQuietly = () => refresh()
    window.addEventListener('storage', refreshQuietly)
    window.addEventListener('focus', refreshQuietly)
    const timer = window.setInterval(refreshQuietly, 5000)
    return () => {
      window.removeEventListener('storage', refreshQuietly)
      window.removeEventListener('focus', refreshQuietly)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => () => clearTimeout(noticeTimer.current), [])

  const loadMenu = async (quiet = false) => {
    setMenuLoading(true)
    setMenuError('')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 6000)
    try {
      const groups = await Promise.all(Object.entries(API).map(async ([category, url]) => {
        const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
        if (!response.ok) throw new Error(category + ' menu unavailable')
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error(category + ' menu unavailable')
        return data.map((item, index) => normalizeDrink(item, category, index))
      }))
      const drinks = groups.flat().filter(drink => drink.title)
      if (!drinks.length) throw new Error('No drinks returned')
      setMenu([...HOUSE_MENU, ...drinks])
      setMenuSource('live')
    } catch (error) {
      setMenu([
        ...HOUSE_MENU,
        ...FALLBACK_MENU.map((item, index) => normalizeDrink(item, index % 2 ? 'Iced' : 'Hot', index)),
      ])
      setMenuSource('fallback')
      if (!quiet) setMenuError('Live menu unavailable — showing house favourites.')
    } finally {
      window.clearTimeout(timeout)
      setMenuLoading(false)
    }
  }

  useEffect(() => {
    loadMenu()
  }, [])

  useEffect(() => {
    if (products.length || !menu.length) return
    const seeded = menu.map(drink => ({
      ...drink,
      available: !soldOut.has(drink.id),
      createdAt: new Date().toISOString(),
    }))
    setProducts(seeded)
    writeProducts(seeded)
  }, [menu, products.length])

  useEffect(() => {
    if (!products.length) return
    const names = new Set(categories.map(category => category.name))
    const findName = matcher => categories.find(category => matcher(category.name.toLowerCase()))?.name
    const hotName = findName(name => name.includes('hot') || name.includes('warm') || name.includes('espresso'))
      || categories[0]?.name || 'Hot'
    const icedName = findName(name => name.includes('iced') || name.includes('cold') || name.includes('ice'))
      || hotName
    let repaired = false
    const fixed = products.map(product => {
      if (names.has(product.category)) return product
      const haystack = `${product.title || ''} ${product.description || ''} ${product.id || ''}`.toLowerCase()
      const isIced = haystack.includes('iced') || haystack.includes('cold')
      repaired = true
      return { ...product, category: isIced ? icedName : hotName }
    })
    if (repaired) {
      setProducts(fixed)
      writeProducts(fixed)
    }
    const missing = [...new Set(fixed.map(product => product.category))].filter(name => !names.has(name))
    if (missing.length) {
      const additions = missing.map(name => ({
        id: 'cat-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        name,
        description: '',
      }))
      const next = [...categories, ...additions]
      setCategories(next)
      writeCategories(next)
    }
  }, [products, categories])

  const refreshOrders = () => {
    setOrders(readOrders())
    setAccounts(readAccounts())
    notify('Order feed refreshed')
  }

  const refreshMenu = () => {
    loadMenu()
    notify('Reloading the live menu')
  }

  const setOrderStatus = (id, status) => {
    const meta = STATUS_META[status]
    if (!meta) return
    const next = readOrders().map(order => (
      order.id === id
        ? {
          ...order,
          status,
          completed: status === 'completed',
          completedAt: status === 'completed' ? new Date().toISOString() : order.completedAt,
        }
        : order
    ))
    setOrders(next)
    writeOrders(next)
    notify(`Order ${id} marked ${meta.label.toLowerCase()}`)
  }

  const completeOrder = id => setOrderStatus(id, 'completed')

  const completeAllOrders = () => {
    const current = readOrders()
    const pending = current.filter(isOpenOrder).length
    if (!pending) return
    const next = current.map(order => (
      isOpenOrder(order) ? { ...order, status: 'completed', completed: true, completedAt: new Date().toISOString() } : order
    ))
    setOrders(next)
    writeOrders(next)
    notify(`${pending} order${pending === 1 ? '' : 's'} marked as completed`)
  }

  const persistSettings = (next, message = 'Store settings saved') => {
    setSettings(next)
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch (error) {}
    notify(message)
  }

  const saveProduct = (draft, id) => {
    const clean = {
      title: String(draft.title || '').trim(),
      description: String(draft.description || '').trim(),
      category: String(draft.category || 'Hot').trim(),
      price: Math.max(0, Number(draft.price) || 0),
      ingredients: Array.isArray(draft.ingredients)
        ? draft.ingredients
        : String(draft.ingredients || '').split(',').map(item => item.trim()).filter(Boolean),
      image: String(draft.image || '').trim() || FALLBACK_IMAGE,
      fallbackImage: draft.fallbackImage || FALLBACK_IMAGE,
      signature: Boolean(draft.signature),
      available: draft.available !== false,
    }
    const next = id
      ? products.map(product => (product.id === id ? { ...product, ...clean } : product))
      : [{
        ...clean,
        id: 'prod-' + Date.now().toString(36),
        createdAt: new Date().toISOString(),
      }, ...products]
    setProducts(next)
    writeProducts(next)
    const targetId = id || next[0].id
    const sold = new Set(soldOut)
    if (clean.available) sold.delete(targetId)
    else sold.add(targetId)
    setSoldOut(sold)
    try { localStorage.setItem(SOLD_OUT_KEY, JSON.stringify([...sold])) } catch (error) {}
    notify(id ? 'Product updated' : 'Product added to the menu')
  }

  const deleteProduct = id => {
    if (!window.confirm('Delete this product from the menu?')) return
    const next = products.filter(product => product.id !== id)
    setProducts(next)
    writeProducts(next)
    const sold = new Set(soldOut)
    sold.delete(id)
    setSoldOut(sold)
    try { localStorage.setItem(SOLD_OUT_KEY, JSON.stringify([...sold])) } catch (error) {}
    notify('Product deleted')
  }

  const saveCategory = (draft, id) => {
    const name = String(draft.name || '').trim()
    if (!name) return
    const clean = { name, description: String(draft.description || '').trim() }
    const previous = id ? categories.find(category => category.id === id) : null
    const next = id
      ? categories.map(category => (category.id === id ? { ...category, ...clean } : category))
      : [...categories, { ...clean, id: 'cat-' + Date.now().toString(36) }]
    setCategories(next)
    writeCategories(next)
    if (previous && previous.name !== name) {
      const nextProducts = products.map(product => (
        product.category === previous.name ? { ...product, category: name } : product
      ))
      setProducts(nextProducts)
      writeProducts(nextProducts)
      if (menuFilter === previous.name) setMenuFilter(name)
    }
    notify(id ? 'Category updated' : 'Category added')
  }

  const deleteCategory = id => {
    const category = categories.find(item => item.id === id)
    if (!category) return
    const inUse = products.filter(product => product.category === category.name).length
    if (inUse) {
      notify(`${inUse} product${inUse === 1 ? '' : 's'} still use ${category.name} — move them first`)
      return
    }
    if (!window.confirm(`Delete the ${category.name} category?`)) return
    const next = categories.filter(item => item.id !== id)
    setCategories(next)
    writeCategories(next)
    notify('Category deleted')
  }

  const toggleSoldOut = id => {
    const next = new Set(soldOut)
    const wasSoldOut = next.has(id)
    if (wasSoldOut) next.delete(id)
    else next.add(id)
    setSoldOut(next)
    try { localStorage.setItem(SOLD_OUT_KEY, JSON.stringify([...next])) } catch (error) {}
    notify(wasSoldOut ? 'Drink marked available' : 'Drink marked sold out')
  }

  const savePhoto = (id, image) => {
    const next = { ...photos, [id]: image }
    try {
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(next))
      setPhotos(next)
      notify('Product photo updated')
    } catch (error) {
      notify('That photo is too large to save — try a smaller image.')
    }
  }

  const resetPhoto = id => {
    const next = { ...photos }
    delete next[id]
    delete next[String(id).replace(/-\d+$/, '')]
    try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(next)) } catch (error) {}
    setPhotos(next)
    notify('Product photo reset')
  }

  const cleanLocalData = () => {
    if (!window.confirm('Clear all local demo data? Orders, customers, cart, sold-out drinks, product photos, products, categories and settings will be removed from this browser.')) return
    [ORDERS_KEY, ACCOUNTS_KEY, SETTINGS_KEY, SOLD_OUT_KEY, PHOTOS_KEY, PRODUCTS_KEY, CATEGORIES_KEY, 'verso_coffee_cart']
      .forEach(key => { try { localStorage.removeItem(key) } catch (error) {} })
    setOrders([])
    setAccounts([])
    setSoldOut(new Set())
    setPhotos({})
    setProducts([])
    setCategories(defaultCategories)
    setSettings(defaultSettings)
    notify('Local demo data cleaned')
  }

  const saveProfile = next => {
    const merged = { ...profile, ...next, joined: profile.joined }
    setProfile(merged)
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(merged)) } catch (error) {}
    notify('Profile updated')
  }

  const changePassword = async (currentPassword, nextPassword) => {
    const response = await fetch('/api/admin/password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword: nextPassword }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Could not update the password.')
    const next = { updatedAt: data.updatedAt || new Date().toISOString() }
    try { localStorage.setItem(SECURITY_KEY, JSON.stringify(next)) } catch (error) {}
    setSecurity(next)
    notify('Password updated')
  }

  const resetPassword = async () => {
    const response = await fetch('/api/admin/password/reset', { method: 'POST', credentials: 'include' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Could not reset the password.')
    try { localStorage.removeItem(SECURITY_KEY) } catch (error) {}
    setSecurity({})
    notify('Password reset to the initial admin password')
  }

  const todayOrders = useMemo(
    () => orders.filter(order => sameDay(order.createdAt)),
    [orders],
  )
  const newOrders = useMemo(() => orders.filter(isOpenOrder), [orders])
  const cancelledOrders = useMemo(() => orders.filter(isCancelled), [orders])
  const todayRevenue = useMemo(
    () => todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [todayOrders],
  )
  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders],
  )
  const todayUnits = useMemo(
    () => todayOrders.reduce((sum, order) => sum + orderUnits(order), 0),
    [todayOrders],
  )
  const totalUnits = useMemo(
    () => orders.reduce((sum, order) => sum + orderUnits(order), 0),
    [orders],
  )
  const averageOrder = orders.length ? totalRevenue / orders.length : 0

  const statusCounts = useMemo(() => {
    const counts = { new: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 }
    orders.forEach(order => { counts[orderStatus(order)] += 1 })
    return counts
  }, [orders])

  const customerRows = useMemo(() => {
    const rows = new Map()
    accounts.forEach(account => {
      const email = String(account.email || '').toLowerCase()
      if (!email) return
      rows.set(email, {
        name: account.name || email.split('@')[0],
        email,
        joined: account.createdAt || account.at || null,
        orders: 0,
        spend: 0,
        last: null,
        member: true,
      })
    })
    orders.forEach(order => {
      const email = String(order.customer?.email || '').toLowerCase()
      if (!email) return
      const row = rows.get(email) || {
        name: order.customer?.name || 'Guest',
        email,
        joined: null,
        orders: 0,
        spend: 0,
        last: null,
        member: false,
      }
      row.orders += 1
      row.spend += Number(order.total || 0)
      const at = new Date(order.createdAt || 0).getTime()
      if (!row.last || at > new Date(row.last).getTime()) row.last = order.createdAt
      rows.set(email, row)
    })
    return [...rows.values()].sort((a, b) => b.spend - a.spend)
  }, [accounts, orders])

  const topDrinks = useMemo(() => {
    const rows = new Map()
    orders.forEach(order => {
      orderItems(order).forEach(item => {
        const name = item.title || 'House coffee'
        const row = rows.get(name) || { name, quantity: 0, revenue: 0 }
        row.quantity += Number(item.quantity || 0)
        row.revenue += Number(item.price || 0) * Number(item.quantity || 0)
        rows.set(name, row)
      })
    })
    return [...rows.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5)
  }, [orders])

  const salesSeries = useMemo(() => {
    const days = salesRange === '30 days' ? 30 : 7
    return Array.from({ length: days }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (days - 1 - index))
      const next = new Date(date)
      next.setDate(next.getDate() + 1)
      const dayOrders = orders.filter(order => {
        const time = new Date(order.createdAt || 0).getTime()
        return time >= date.getTime() && time < next.getTime()
      })
      return {
        label: days === 7
          ? date.toLocaleDateString(undefined, { weekday: 'short' })
          : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        revenue: Number(dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0).toFixed(2)),
        orders: dayOrders.length,
      }
    })
  }, [orders, salesRange])

  const paymentRows = useMemo(() => orders.map(order => {
    const status = isComplete(order) ? 'Paid' : isCancelled(order) ? 'Refunded' : 'Pending'
    return {
      id: 'PAY-' + order.id,
      orderId: order.id,
      customer: order.customer?.name || 'Guest',
      email: order.customer?.email || 'Walk-in customer',
      amount: Number(order.total || 0),
      method: order.paymentMethod || 'Card',
      status,
      createdAt: order.createdAt,
    }
  }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [orders])

  const collectedPayments = paymentRows.filter(row => row.status === 'Paid').reduce((sum, row) => sum + row.amount, 0)
  const pendingPayments = paymentRows.filter(row => row.status === 'Pending').reduce((sum, row) => sum + row.amount, 0)
  const refundedPayments = paymentRows.filter(row => row.status === 'Refunded').reduce((sum, row) => sum + row.amount, 0)

  const hotCount = products.filter(drink => drink.category === 'Hot').length
  const icedCount = products.filter(drink => drink.category === 'Iced').length
  const signatureCount = products.filter(drink => drink.signature).length
  const averagePrice = products.length
    ? products.reduce((sum, drink) => sum + Number(drink.price || 0), 0) / products.length
    : 0
  const displayProducts = useMemo(
    () => products.map(drink => {
      const custom = storedPhoto(photos, drink.id)
      return {
        ...drink,
        image: custom || drink.image,
        available: !soldOut.has(drink.id),
      }
    }),
    [products, photos, soldOut],
  )
  const productCategories = useMemo(
    () => categories.map(category => ({
      ...category,
      count: products.filter(product => product.category === category.name).length,
    })),
    [categories, products],
  )

  const searchable = ['Orders', 'Products', 'Customers'].includes(active)
  const searchPlaceholder = active === 'Orders'
    ? 'Search orders or customers...'
    : active === 'Products'
      ? 'Search products...'
      : 'Search customers...'
  const needle = search.trim().toLowerCase()

  const filteredOrders = orders.filter(order => {
    if (orderFilter === 'New' && !isOpenOrder(order)) return false
    if (orderFilter === 'Completed' && !isComplete(order)) return false
    if (orderFilter === 'Cancelled' && !isCancelled(order)) return false
    if (!needle) return true
    const customer = order.customer || {}
    const items = orderItems(order).map(item => item.title).join(' ')
    return `${order.id} ${customer.name || ''} ${customer.email || ''} ${items}`.toLowerCase().includes(needle)
  })

  const filteredProducts = displayProducts.filter(drink => {
    if (menuFilter === 'Signature' && !drink.signature) return false
    if (menuFilter !== 'All' && menuFilter !== 'Signature' && drink.category !== menuFilter) return false
    if (!needle) return true
    const ingredients = Array.isArray(drink.ingredients) ? drink.ingredients.join(' ') : ''
    return `${drink.title} ${drink.description} ${ingredients}`.toLowerCase().includes(needle)
  })

  const filteredCustomers = customerRows.filter(customer => (
    !needle || `${customer.name} ${customer.email}`.toLowerCase().includes(needle)
  ))

  const memberOrders = orders.filter(order => (
    accounts.some(account => String(account.email || '').toLowerCase() === String(order.customer?.email || '').toLowerCase())
  )).length
  const guestOrders = orders.length - memberOrders

  const pageAction = (() => {
    if (active === 'Orders') {
      return <button className="ghost-button" onClick={refreshOrders}><RefreshCw size={15} /> Refresh orders</button>
    }
    if (active === 'Products') {
      return <button className="ghost-button" onClick={refreshMenu} disabled={menuLoading}><RefreshCw size={15} /> Refresh live menu</button>
    }
    if (active === 'Customers' || active === 'Payments') {
      return <button className="ghost-button" onClick={() => setActive('Orders')}>View orders <ArrowUpRight size={15} /></button>
    }
    if (active === 'Reports' || active === 'Categories') {
      return <button className="ghost-button" onClick={() => setActive('Products')}>Browse products <ArrowUpRight size={15} /></button>
    }
    return <a className="ghost-button" href="/shop.html" target="_blank" rel="noreferrer">Customer view <ArrowUpRight size={15} /></a>
  })()

  const handleBell = () => {
    if (newOrders.length) {
      setActive('Orders')
      notify(`${newOrders.length} new order${newOrders.length === 1 ? '' : 's'} waiting for pickup`)
    } else {
      notify('You are all caught up - no new orders.')
    }
  }

  if (!authReady) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        <span className="auth-loading-spinner" aria-hidden="true" />
        <p>Checking admin access...</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Coffee size={19} /></div>
          <div className="brand-copy"><b>VERSO</b><small>coffee · admin</small></div>
          <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <button className="store-switch" onClick={() => setActive('Settings')}>
          <div className="store-avatar"><Store size={17} /></div>
          <div><b>{settings.storeName}</b><small>{settings.acceptingOrders ? 'Open for orders' : 'Ordering paused'}</small></div>
          <ChevronDown size={15} />
        </button>

        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => setActive(item.label)}
                className={`nav-item ${active === item.label ? 'selected' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.label === 'Orders' && newOrders.length > 0 && <i className="nav-count nav-count-new">{newOrders.length}</i>}
                {item.label === 'Products' && products.length > 0 && <i className="nav-count">{products.length}</i>}
              </button>
            )
          })}
          <button className="nav-item nav-logout" onClick={logout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="side-card">
            <div className="side-card-top"><span><Sparkles size={14} /> TODAY</span><i className="live-dot" /></div>
            <b>{newOrders.length ? `${newOrders.length} order${newOrders.length === 1 ? '' : 's'} waiting` : 'All caught up'}</b>
            <p>{newOrders.length ? 'New pickups are ready for the counter.' : 'New customer orders will land here automatically.'}</p>
            <button onClick={() => setActive('Orders')}>Open order queue <ArrowUpRight size={13} /></button>
          </div>
          <div className="profile">
            <button className="profile-open" onClick={() => setActive('Profile')} aria-label="Open profile">
              <div className="avatar">{userInitial}</div>
              <div><b>{userName}</b><small>{profile.title || 'Store manager'}</small></div>
            </button>
            <button className="profile-logout" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {mobileNav && <button className="sidebar-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="breadcrumb">VERSO Coffee <span>/</span> <b>{active}</b></div>
          <div className="top-actions">
            {searchable ? (
              <label className="search-box">
                <Search size={16} />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder={searchPlaceholder} />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={13} /></button>}
              </label>
            ) : (
              <div className="date-chip"><CalendarDays size={15} /><span>{todayLabel}</span></div>
            )}
            <span className={`open-chip ${settings.acceptingOrders ? 'is-open' : 'is-paused'}`}>
              <i /> {settings.acceptingOrders ? 'Open' : 'Paused'}
            </span>
            <button className="icon-button notification" onClick={handleBell} aria-label="Notifications">
              <Bell size={18} />
              {newOrders.length > 0 && <i>{newOrders.length}</i>}
            </button>
            <button className="top-avatar" type="button" onClick={() => setActive('Profile')} aria-label="Open profile" title="Open profile">{userInitial}</button>
          </div>
        </header>

        <div className="content">
          {active !== 'Dashboard' && (
            <PageHeader active={active} action={pageAction} />
          )}

          {active === 'Dashboard' && (
            <OverviewPage
              greeting={greeting}
              firstName={firstName}
              todayLabel={todayLabel}
              settings={settings}
              newOrders={newOrders}
              todayOrders={todayOrders}
              todayRevenue={todayRevenue}
              todayUnits={todayUnits}
              totalRevenue={totalRevenue}
              totalOrders={orders.length}
              totalProducts={products.length}
              statusCounts={statusCounts}
              customerCount={customerRows.length}
              memberCount={accounts.length}
              salesData={salesSeries}
              salesRange={salesRange}
              setSalesRange={setSalesRange}
              topDrinks={topDrinks}
              orders={orders}
              onNavigate={setActive}
              onSaveSettings={persistSettings}
            />
          )}

          {active === 'Orders' && (
            <OrdersPage
              orders={orders}
              filteredOrders={filteredOrders}
              newCount={newOrders.length}
              orderFilter={orderFilter}
              setOrderFilter={setOrderFilter}
              onComplete={completeOrder}
              onCompleteAll={completeAllOrders}
              onStatusChange={setOrderStatus}
              onRefresh={refreshOrders}
              pickup={settings.pickup}
              onNavigate={setActive}
            />
          )}

          {active === 'Products' && (
            <ProductsPage
              products={displayProducts}
              filteredProducts={filteredProducts}
              categories={productCategories}
              menuLoading={menuLoading}
              menuSource={menuSource}
              menuError={menuError}
              menuFilter={menuFilter}
              setMenuFilter={setMenuFilter}
              photos={photos}
              onToggleSoldOut={toggleSoldOut}
              onSavePhoto={savePhoto}
              onResetPhoto={resetPhoto}
              onSaveProduct={saveProduct}
              onDeleteProduct={deleteProduct}
              onRefresh={refreshMenu}
              hotCount={hotCount}
              icedCount={icedCount}
              signatureCount={signatureCount}
              averagePrice={averagePrice}
            />
          )}

          {active === 'Categories' && (
            <CategoriesPage
              categories={productCategories}
              productCount={products.length}
              onSave={saveCategory}
              onDelete={deleteCategory}
              onViewProducts={category => { setMenuFilter(category.name); setActive('Products') }}
            />
          )}

          {active === 'Customers' && (
            <CustomersPage
              customers={filteredCustomers}
              totalCount={customerRows.length}
              memberCount={accounts.length}
              orderCount={orders.length}
              totalRevenue={totalRevenue}
              repeatCount={customerRows.filter(customer => customer.orders > 1).length}
              onNavigate={setActive}
            />
          )}

          {active === 'Payments' && (
            <PaymentsPage
              rows={paymentRows}
              collected={collectedPayments}
              pending={pendingPayments}
              refunded={refundedPayments}
              onNavigate={setActive}
            />
          )}

          {active === 'Reports' && (
            <InsightsPage
              orders={orders}
              topDrinks={topDrinks}
              salesData={salesSeries}
              salesRange={salesRange}
              setSalesRange={setSalesRange}
              totalRevenue={totalRevenue}
              totalUnits={totalUnits}
              averageOrder={averageOrder}
              hotCount={hotCount}
              icedCount={icedCount}
              signatureCount={signatureCount}
              memberOrders={memberOrders}
              guestOrders={guestOrders}
              onNavigate={setActive}
            />
          )}

          {active === 'Profile' && (
            <ProfilePage
              profile={profile}
              session={session}
              security={security}
              orders={orders}
              accounts={accounts}
              menu={products}
              totalRevenue={totalRevenue}
              onSaveProfile={saveProfile}
              onChangePassword={changePassword}
              onResetPassword={resetPassword}
              onNavigate={setActive}
              onCleanData={cleanLocalData}
              onLogout={logout}
            />
          )}

          {active === 'Settings' && (
            <SettingsPage
              settings={settings}
              session={session}
              profile={profile}
              onOpenProfile={() => setActive('Profile')}
              onSave={persistSettings}
              onCleanData={cleanLocalData}
              notify={notify}
            />
          )}

          <footer>
            <span>© 2026 VERSO Coffee · Admin console</span>
            <span><i className="live-dot" /> {orders.length} orders · {products.length} products</span>
          </footer>
        </div>
      </main>

      {notice && (
        <div className="toast">
          <Check size={16} />
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}
    </div>
  )
}

function PageHeader({ active, action }) {
  const [title, subtitle] = overviewMeta[active] || [active, '']
  return (
    <section className="page-head" data-aos="fade-down">
      <div>
        <div className="eyebrow">VER<span>SO</span> COFFEE · {active.toUpperCase()}</div>
        <h1>{title}<span className="title-dot">.</span></h1>
        <p>{subtitle}</p>
      </div>
      <div className="page-actions">{action}</div>
    </section>
  )
}

function OverviewPage({
  greeting, firstName, todayLabel, settings, newOrders, todayOrders, todayRevenue,
  todayUnits, totalRevenue, totalOrders, totalProducts, statusCounts, customerCount,
  memberCount, salesData, salesRange, setSalesRange, topDrinks, orders, onNavigate,
  onSaveSettings,
}) {
  return (
    <>
      <section className="welcome-row" data-aos="fade-down">
        <div>
          <div className="eyebrow"><span className="live-dot" /> LIVE · {todayLabel}</div>
          <h1>{greeting}, {firstName}<span className="title-mark"> ✦</span></h1>
          <p className="subheading">Here is how the coffee shop is doing today.</p>
        </div>
        <div className="welcome-actions">
          <span className={`store-pill ${settings.acceptingOrders ? 'is-open' : 'is-paused'}`}>
            <i /> {settings.acceptingOrders ? 'Store is open' : 'Ordering paused'}
          </span>
          <button className="primary-button" onClick={() => onNavigate('Orders')}>
            View orders {newOrders.length > 0 && <b>{newOrders.length}</b>}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {newOrders.length > 0 && (
        <button className="attention-banner" onClick={() => onNavigate('Orders')} data-aos="fade-up">
          <span className="attention-icon"><ShoppingBag size={19} /></span>
          <span><b>{newOrders.length} new order{newOrders.length === 1 ? '' : 's'} waiting</b><small>Open the queue and mark pickups as completed.</small></span>
          <ArrowUpRight size={18} />
        </button>
      )}

      <section className="stat-grid" data-aos="fade-up" data-aos-delay="80">
        <Stat icon={CircleDollarSign} label="Total revenue" value={money(totalRevenue)} detail={`${money(todayRevenue)} today`} note={`${orders.length} orders all time`} tone="gold" />
        <Stat icon={ShoppingBag} label="Total orders" value={totalOrders} unit="orders" detail={`${newOrders.length} waiting`} note={`${statusCounts.completed} completed`} tone="green" />
        <Stat icon={Package} label="Total products" value={totalProducts} unit="products" detail={`${todayUnits} sold today`} note="Across the menu" tone="blue" />
        <Stat icon={Users} label="Total customers" value={customerCount} detail={`${memberCount} members`} note="Accounts and guests" tone="terra" />
      </section>

      <section className="status-overview" data-aos="fade-up" data-aos-delay="100">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button
            key={key}
            className={`status-card status-${meta.tone}`}
            onClick={() => onNavigate('Orders')}
          >
            <span>{meta.label}</span>
            <b>{statusCounts[key]}</b>
          </button>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="panel sales-panel" data-aos="fade-up" data-aos-delay="120">
          <div className="panel-heading">
            <div><h2>Sales overview</h2><p>Revenue from completed and live orders</p></div>
            <div className="period-tabs">
              {['7 days', '30 days'].map(option => (
                <button key={option} className={salesRange === option ? 'active' : ''} onClick={() => setSalesRange(option)}>{option}</button>
              ))}
            </div>
          </div>
          <SalesChart data={salesData} range={salesRange} />
          <div className="chart-foot"><span><i className="legend-dot" /> Revenue</span><span>Updates automatically</span></div>
        </div>
        <TopDrinksPanel drinks={topDrinks} onNavigate={onNavigate} />
      </section>

      <section className="lower-grid">
        <div className="panel recent-panel" data-aos="fade-up" data-aos-delay="100">
          <div className="panel-heading">
            <div><h2>Recent orders</h2><p>{newOrders.length ? `${newOrders.length} waiting for pickup` : 'The queue is clear'}</p></div>
            <button className="text-link" onClick={() => onNavigate('Orders')}>All orders <ArrowUpRight size={14} /></button>
          </div>
          {orders.length === 0 ? (
            <div className="empty-compact">
              <ShoppingBag size={20} />
              <div><b>No orders yet</b><span>Place a test order from the customer shop to see it here.</span></div>
            </div>
          ) : (
            <div className="recent-list">
              {orders.slice(0, 4).map(order => (
                <RecentOrder key={order.id} order={order} onOpen={() => onNavigate('Orders')} />
              ))}
            </div>
          )}
        </div>

        <div className="panel pulse-panel" data-aos="fade-up" data-aos-delay="160">
          <div className="panel-heading">
            <div><h2>Store pulse</h2><p>Today at the counter</p></div>
            <span className="soft-pill">{todayOrders.length} orders</span>
          </div>
          <button
            className={`order-switch ${settings.acceptingOrders ? 'on' : ''}`}
            onClick={() => onSaveSettings(
              { ...settings, acceptingOrders: !settings.acceptingOrders },
              settings.acceptingOrders ? 'Online ordering paused' : 'Online ordering resumed',
            )}
          >
            <span className="toggle"><span /></span>
            <span><b>{settings.acceptingOrders ? 'Accepting orders' : 'Ordering paused'}</b><small>{settings.acceptingOrders ? 'Customers can check out' : 'Checkout is paused in the shop'}</small></span>
            {settings.acceptingOrders ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
          </button>
          <div className="pulse-list">
            <div><span><Clock size={14} /> Opening hours</span><b>{settings.hours}</b></div>
            <div><span><MapPin size={14} /> Pickup</span><b>{settings.pickup}</b></div>
            <div><span><ShoppingCart size={14} /> Average order</span><b>{money(todayOrders.length ? todayRevenue / todayOrders.length : 0)}</b></div>
          </div>
          <a className="text-link" href="/shop.html" target="_blank" rel="noreferrer">Open customer view <ArrowUpRight size={14} /></a>
        </div>
      </section>
    </>
  )
}

function OrdersPage({
  orders, filteredOrders, newCount, orderFilter, setOrderFilter, onComplete,
  onCompleteAll, onStatusChange, onRefresh, pickup, onNavigate,
}) {
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const units = orders.reduce((sum, order) => sum + orderUnits(order), 0)
  const customers = new Set(orders.map(order => order.customer?.email).filter(Boolean)).size
  const counts = {
    All: orders.length,
    New: orders.filter(isOpenOrder).length,
    Completed: orders.filter(isComplete).length,
    Cancelled: orders.filter(isCancelled).length,
  }

  return (
    <>
      <section className="stat-grid" data-aos="fade-up" data-aos-delay="80">
        <Stat icon={ShoppingBag} label="New orders" value={newCount} unit="waiting" detail="Live queue" note={newCount ? 'Needs attention' : 'All caught up'} tone="gold" />
        <Stat icon={CircleDollarSign} label="Order revenue" value={money(revenue)} detail={`${orders.length} orders`} note="Across all orders" tone="green" />
        <Stat icon={ShoppingCart} label="Drinks sold" value={units} unit="cups" detail={`${counts.Completed} completed`} note="Hot and iced" tone="blue" />
        <Stat icon={Users} label="Customers" value={customers} detail="From orders" note="Unique checkouts" tone="terra" />
      </section>

      <section className="panel orders-panel" data-aos="fade-up" data-aos-delay="120">
        <div className="panel-heading orders-heading">
          <div><h2>Order queue</h2><p>{filteredOrders.length} shown · {newCount} new · updates automatically</p></div>
          <div className="heading-actions">
            {newCount > 0
              ? <button className="ghost-button" onClick={onCompleteAll}><CheckCircle2 size={15} /> Complete all</button>
              : <button className="ghost-button" onClick={onRefresh}><RefreshCw size={15} /> Refresh</button>}
          </div>
        </div>

        <div className="filter-tabs" role="tablist" aria-label="Filter orders">
          {['All', 'New', 'Completed', 'Cancelled'].map(option => (
            <button key={option} role="tab" aria-selected={orderFilter === option} className={orderFilter === option ? 'active' : ''} onClick={() => setOrderFilter(option)}>
              {option} <span>{counts[option]}</span>
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={orders.length === 0 ? 'No orders yet' : 'No orders match this view'}
            copy={orders.length === 0
              ? 'When a customer checks out in VERSO Coffee, their order appears here automatically.'
              : 'Try another filter or clear the search to see the rest of the queue.'}
          >
            {orders.length === 0 ? (
              <button className="ghost-button" onClick={() => onNavigate('Products')}>Browse the menu <ArrowUpRight size={14} /></button>
            ) : (
              <button className="ghost-button" onClick={() => setOrderFilter('All')}>Show all orders</button>
            )}
          </EmptyState>
        ) : (
          <div className="orders-list">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} pickup={pickup} onComplete={onComplete} onStatusChange={onStatusChange} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function ProductsPage({
  products, filteredProducts, categories, menuLoading, menuSource, menuError,
  menuFilter, setMenuFilter, photos, onToggleSoldOut, onSavePhoto, onResetPhoto,
  onSaveProduct, onDeleteProduct, onRefresh, hotCount, icedCount, signatureCount,
  averagePrice,
}) {
  const [editingPhoto, setEditingPhoto] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const sourceCopy = menuSource === 'live'
    ? 'Synced with the live SampleAPIs coffee menu'
    : menuSource === 'fallback'
      ? 'Showing house favourites while the live menu is unavailable'
      : 'Loading the live coffee menu'
  const filterOptions = ['All', ...categories.map(category => category.name), 'Signature']

  return (
    <>
      <section className="stat-grid" data-aos="fade-up" data-aos-delay="80">
        <Stat icon={Package} label="Products" value={products.length} unit="items" detail="Menu catalogue" note="Managed in this dashboard" tone="green" />
        <Stat icon={Coffee} label="Hot drinks" value={hotCount} detail="Espresso bar" note="Served warm" tone="gold" />
        <Stat icon={Snowflake} label="Iced drinks" value={icedCount} detail="Cold bar" note="Over ice" tone="blue" />
        <Stat icon={Star} label="Average price" value={money(averagePrice)} detail={`${signatureCount} signature`} note="Across the menu" tone="terra" />
      </section>

      <section className="panel menu-panel" data-aos="fade-up" data-aos-delay="120">
        <div className="panel-heading orders-heading">
          <div><h2>Products</h2><p>{sourceCopy} · {filteredProducts.length} of {products.length} shown</p></div>
          <div className="heading-actions">
            <button className="ghost-button" onClick={onRefresh} disabled={menuLoading}><RefreshCw size={15} /> Refresh</button>
            <button className="primary-button" onClick={() => setEditingProduct({})}><Plus size={15} /> Add product</button>
          </div>
        </div>

        {menuError && <div className="inline-note">{menuError}</div>}

        <div className="filter-tabs" role="tablist" aria-label="Filter products">
          {filterOptions.map(option => (
            <button key={option} role="tab" aria-selected={menuFilter === option} className={menuFilter === option ? 'active' : ''} onClick={() => setMenuFilter(option)}>{option}</button>
          ))}
        </div>

        {menuLoading && products.length === 0 ? (
          <div className="menu-grid">
            {Array.from({ length: 6 }).map((_, index) => <div className="menu-card menu-skeleton" key={index} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState icon={Coffee} title="No products loaded" copy="The product catalogue is empty. Reload the menu or add a product manually.">
            <button className="ghost-button" onClick={onRefresh}><RefreshCw size={14} /> Reload menu</button>
            <button className="primary-button" onClick={() => setEditingProduct({})}><Plus size={14} /> Add product</button>
          </EmptyState>
        ) : filteredProducts.length === 0 ? (
          <EmptyState icon={Coffee} title="No products match this view" copy="Try a different category, clear the search or add a new product.">
            <button className="ghost-button" onClick={() => setMenuFilter('All')}>Show all products</button>
          </EmptyState>
        ) : (
          <div className="menu-grid">
            {filteredProducts.map(drink => {
              const unavailable = !drink.available
              return (
                <article className={`menu-card ${unavailable ? 'is-sold-out' : ''}`} key={drink.id}>
                  <div className="menu-media">
                    <img
                      src={drink.image || FALLBACK_IMAGE}
                      alt={drink.title}
                      loading="lazy"
                      onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = drink.fallbackImage || FALLBACK_IMAGE }}
                    />
                    <span className="menu-category">{drink.category}</span>
                    {drink.signature && <span className="menu-signature"><Star size={11} /> Signature</span>}
                    <button
                      className={`menu-photo-btn ${storedPhoto(photos, drink.id) ? 'is-custom' : ''}`}
                      type="button"
                      onClick={() => setEditingPhoto(drink)}
                      aria-label={`${storedPhoto(photos, drink.id) ? 'Edit' : 'Add'} photo for ${drink.title}`}
                    >
                      <ImagePlus size={12} /> {storedPhoto(photos, drink.id) ? 'Edit photo' : 'Add photo'}
                    </button>
                  </div>
                  <div className="menu-body">
                    <div className="menu-title-row"><h3>{drink.title}</h3><strong>{money(drink.price)}</strong></div>
                    <p>{drink.description}</p>
                    <div className="menu-tags">{(drink.ingredients || []).slice(0, 3).map(ingredient => <span key={ingredient}>{ingredient}</span>)}</div>
                    <div className="menu-actions">
                      <span className={`avail ${unavailable ? 'out' : 'live'}`}><i /> {unavailable ? 'Sold out' : 'Available'}</span>
                      <button className="text-button" onClick={() => onToggleSoldOut(drink.id)}>{unavailable ? 'Mark available' : 'Mark sold out'}</button>
                    </div>
                    <div className="product-card-actions">
                      <button className="ghost-button small" onClick={() => setEditingProduct(drink)}><Pencil size={13} /> Edit</button>
                      <button className="ghost-button small danger-button" onClick={() => onDeleteProduct(drink.id)}><Trash2 size={13} /> Delete</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {editingPhoto && (
        <PhotoEditor
          key={editingPhoto.id}
          drink={editingPhoto}
          current={storedPhoto(photos, editingPhoto.id)}
          onClose={() => setEditingPhoto(null)}
          onSave={onSavePhoto}
          onReset={onResetPhoto}
        />
      )}

      {editingProduct && (
        <ProductEditor
          key={editingProduct.id || 'new-product'}
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSave={onSaveProduct}
        />
      )}
    </>
  )
}

function ProductEditor({ product, categories, onClose, onSave }) {
  const isNew = !product.id
  const [draft, setDraft] = useState({
    title: product.title || '',
    description: product.description || '',
    category: product.category || categories[0]?.name || 'Hot',
    price: product.price ?? '',
    ingredients: Array.isArray(product.ingredients) ? product.ingredients.join(', ') : '',
    image: product.image || '',
    signature: Boolean(product.signature),
    available: product.available !== false,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const update = (key, value) => {
    setDraft(current => ({ ...current, [key]: value }))
    setError('')
  }

  const submit = event => {
    event.preventDefault()
    if (String(draft.title).trim().length < 2) {
      setError('Enter a product name (at least 2 characters).')
      return
    }
    if (Number(draft.price) < 0 || Number.isNaN(Number(draft.price))) {
      setError('Enter a valid price.')
      return
    }
    onSave(draft, product.id)
    onClose()
  }

  return (
    <div className="photo-modal" role="dialog" aria-modal="true" aria-labelledby="productTitle" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <form className="photo-dialog product-dialog" onSubmit={submit}>
        <div className="photo-dialog-head">
          <div>
            <h2 id="productTitle">{isNew ? 'Add product' : 'Edit product'}</h2>
            <p>{isNew ? 'Create a new drink for the menu.' : `Update ${product.title}.`}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close product editor"><X size={17} /></button>
        </div>

        <div className="form-grid">
          <label className="form-field full">
            <span>Product name</span>
            <input value={draft.title} onChange={event => update('title', event.target.value)} placeholder="Salted Caramel Latte" />
          </label>
          <label className="form-field">
            <span>Category</span>
            <select value={draft.category} onChange={event => update('category', event.target.value)}>
              {categories.map(category => <option key={category.id} value={category.name}>{category.name}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Price (USD)</span>
            <input type="number" min="0" step="0.01" value={draft.price} onChange={event => update('price', event.target.value)} placeholder="4.75" />
          </label>
          <label className="form-field full">
            <span>Description</span>
            <textarea rows="3" value={draft.description} onChange={event => update('description', event.target.value)} placeholder="Double espresso, steamed oat milk and house caramel." />
          </label>
          <label className="form-field full">
            <span>Ingredients (comma separated)</span>
            <input value={draft.ingredients} onChange={event => update('ingredients', event.target.value)} placeholder="Coffee, Oat milk, Caramel" />
          </label>
          <label className="form-field full">
            <span>Image URL</span>
            <input value={draft.image} onChange={event => update('image', event.target.value)} placeholder="https://images.unsplash.com/photo-..." />
          </label>
          <label className="check-field">
            <input type="checkbox" checked={draft.signature} onChange={event => update('signature', event.target.checked)} />
            <span>Signature drink</span>
          </label>
          <label className="check-field">
            <input type="checkbox" checked={draft.available} onChange={event => update('available', event.target.checked)} />
            <span>Available for ordering</span>
          </label>
        </div>

        {error && <p className="photo-error">{error}</p>}

        <div className="photo-actions">
          <span className="photo-note">{isNew ? 'Saved in this browser store.' : 'Changes apply to the dashboard menu.'}</span>
          <div>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit"><Check size={15} /> {isNew ? 'Add product' : 'Save product'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function PhotoEditor({ drink, current, onClose, onSave, onReset }) {
  const [value, setValue] = useState(current || '')
  const [preview, setPreview] = useState(current || drink.image || FALLBACK_IMAGE)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const pickFile = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const dataUrl = await readImageFile(file)
      setValue(dataUrl)
      setPreview(dataUrl)
    } catch (readError) {
      setError(readError.message || 'Could not read that image.')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  const submit = event => {
    event.preventDefault()
    const next = value.trim()
    if (!next) {
      setError('Upload a photo or paste an image URL.')
      return
    }
    onSave(drink.id, next)
    onClose()
  }

  const reset = () => {
    onReset(drink.id)
    onClose()
  }

  return (
    <div className="photo-modal" role="dialog" aria-modal="true" aria-labelledby="photoTitle" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <form className="photo-dialog" onSubmit={submit}>
        <div className="photo-dialog-head">
          <div>
            <h2 id="photoTitle">Product photo</h2>
            <p>Upload a new image or paste a URL for {drink.title}.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close photo editor"><X size={17} /></button>
        </div>

        <div className="photo-preview">
          <img
            src={preview || FALLBACK_IMAGE}
            alt={`${drink.title} preview`}
            onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = drink.fallbackImage || FALLBACK_IMAGE }}
          />
        </div>

        <div className="photo-fields">
          <label className="form-field full">
            <span>Image URL</span>
            <input
              type="text"
              value={value}
              onChange={event => { setValue(event.target.value); setPreview(event.target.value); setError('') }}
              placeholder="https://images.unsplash.com/photo-..."
            />
          </label>
          <label className="photo-upload">
            <Upload size={15} />
            <span>{busy ? 'Preparing image…' : 'Upload from your computer'}</span>
            <input type="file" accept="image/*" onChange={pickFile} disabled={busy} />
          </label>
          {error && <p className="photo-error">{error}</p>}
        </div>

        <div className="photo-actions">
          {current
            ? <button className="ghost-button" type="button" onClick={reset}><RotateCcw size={14} /> Reset to menu photo</button>
            : <span className="photo-note">Saved in this browser only.</span>}
          <div>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit" disabled={busy}><Check size={15} /> Save photo</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function CategoriesPage({ categories, productCount, onSave, onDelete, onViewProducts }) {
  const [editing, setEditing] = useState(null)
  const used = categories.filter(category => category.count > 0).length
  const average = categories.length ? productCount / categories.length : 0

  return (
    <>
      <section className="stat-grid" data-aos="fade-up" data-aos-delay="80">
        <Stat icon={Tags} label="Categories" value={categories.length} unit="groups" detail="Menu structure" note="Used by the product catalogue" tone="gold" />
        <Stat icon={Package} label="Products" value={productCount} detail="Across all groups" note="Every drink on the menu" tone="green" />
        <Stat icon={CheckCircle2} label="Categories in use" value={used} detail={`${categories.length - used} empty`} note="Have at least one product" tone="blue" />
        <Stat icon={BarChart3} label="Average per category" value={average.toFixed(1)} unit="items" detail="Balanced menu" note="Products per group" tone="terra" />
      </section>

      <section className="panel" data-aos="fade-up" data-aos-delay="120">
        <div className="panel-heading">
          <div><h2>Categories</h2><p>Group the menu so customers can browse quickly.</p></div>
          <button className="primary-button" onClick={() => setEditing({})}><Plus size={15} /> Add category</button>
        </div>

        {categories.length === 0 ? (
          <EmptyState icon={Tags} title="No categories yet" copy="Create a category before adding products to the menu.">
            <button className="ghost-button" onClick={() => setEditing({})}>Add your first category</button>
          </EmptyState>
        ) : (
          <div className="category-grid">
            {categories.map(category => (
              <article className="category-card" key={category.id}>
                <span className="category-icon"><Tags size={18} /></span>
                <div className="category-main">
                  <b>{category.name}</b>
                  <p>{category.description || 'No description yet.'}</p>
                  <span className="soft-pill">{category.count} product{category.count === 1 ? '' : 's'}</span>
                </div>
                <div className="category-actions">
                  <button className="ghost-button small" onClick={() => onViewProducts(category)}><Coffee size={13} /> Products</button>
                  <button className="ghost-button small" onClick={() => setEditing(category)}><Pencil size={13} /> Edit</button>
                  <button className="ghost-button small danger-button" onClick={() => onDelete(category.id)}><Trash2 size={13} /> Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <CategoryEditor
          key={editing.id || 'new-category'}
          category={editing}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </>
  )
}

function CategoryEditor({ category, onClose, onSave }) {
  const isNew = !category.id
  const [draft, setDraft] = useState({ name: category.name || '', description: category.description || '' })
  const [error, setError] = useState('')

  const submit = event => {
    event.preventDefault()
    if (String(draft.name).trim().length < 2) {
      setError('Enter a category name (at least 2 characters).')
      return
    }
    onSave(draft, category.id)
    onClose()
  }

  return (
    <div className="photo-modal" role="dialog" aria-modal="true" aria-labelledby="categoryTitle" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <form className="photo-dialog product-dialog" onSubmit={submit}>
        <div className="photo-dialog-head">
          <div>
            <h2 id="categoryTitle">{isNew ? 'Add category' : 'Edit category'}</h2>
            <p>{isNew ? 'Create a new group for the menu.' : `Update ${category.name}.`}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close category editor"><X size={17} /></button>
        </div>
        <div className="form-grid">
          <label className="form-field full">
            <span>Category name</span>
            <input value={draft.name} onChange={event => { setDraft({ ...draft, name: event.target.value }); setError('') }} placeholder="Hot drinks" />
          </label>
          <label className="form-field full">
            <span>Description</span>
            <textarea rows="3" value={draft.description} onChange={event => { setDraft({ ...draft, description: event.target.value }); setError('') }} placeholder="Warm espresso bar favourites." />
          </label>
        </div>
        {error && <p className="photo-error">{error}</p>}
        <div className="photo-actions">
          <span className="photo-note">Categories organise the product catalogue.</span>
          <div>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit"><Check size={15} /> {isNew ? 'Add category' : 'Save category'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function PaymentsPage({ rows, collected, pending, refunded, onNavigate }) {
  return (
    <>
      <section className="stat-grid" data-aos="fade-up" data-aos-delay="80">
        <Stat icon={Banknote} label="Collected" value={money(collected)} detail="Completed orders" note="Paid in full" tone="green" />
        <Stat icon={Clock} label="Pending" value={money(pending)} detail="Awaiting pickup" note="Not settled yet" tone="gold" />
        <Stat icon={RotateCcw} label="Refunded" value={money(refunded)} detail="Cancelled orders" note="Returned to customers" tone="terra" />
        <Stat icon={Wallet} label="Transactions" value={rows.length} unit="payments" detail="All time" note="Linked to orders" tone="blue" />
      </section>

      <section className="panel" data-aos="fade-up" data-aos-delay="120">
        <div className="panel-heading">
          <div><h2>Payment ledger</h2><p>Every order and its payment state.</p></div>
          <button className="text-link" onClick={() => onNavigate('Orders')}>Manage orders <ArrowUpRight size={14} /></button>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments yet" copy="Payments appear automatically when customers check out in the shop.">
            <button className="ghost-button" onClick={() => onNavigate('Orders')}>Open orders</button>
          </EmptyState>
        ) : (
          <div className="payment-list">
            <div className="payment-row payment-head">
              <span>Payment</span><span>Customer</span><span>Method</span><span>Status</span><span>Amount</span>
            </div>
            {rows.map(row => (
              <div className="payment-row" key={row.id}>
                <div className="payment-id"><b>{row.id}</b><small>{row.orderId} · {shortDate(row.createdAt)}</small></div>
                <div className="payment-customer"><b>{row.customer}</b><small>{row.email}</small></div>
                <span className="payment-method"><CreditCard size={13} /> {row.method}</span>
                <span className={`status-pill ${row.status === 'Paid' ? 'good' : row.status === 'Refunded' ? 'cancelled' : 'new'}`}>{row.status}</span>
                <strong className="payment-amount">{money(row.amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function CustomersPage({ customers, totalCount, memberCount, orderCount, totalRevenue, repeatCount, onNavigate }) {
  return (
    <>
      <section className="stat-grid" data-aos="fade-up" data-aos-delay="80">
        <Stat icon={Users} label="Customers" value={totalCount} detail={`${memberCount} members`} note="Accounts and guests" tone="green" />
        <Stat icon={UserRound} label="Repeat customers" value={repeatCount} detail="2+ orders" note="Coming back for more" tone="gold" />
        <Stat icon={ShoppingBag} label="Orders placed" value={orderCount} detail="All time" note="Across the shop" tone="blue" />
        <Stat icon={CircleDollarSign} label="Customer spend" value={money(totalRevenue)} detail="All orders" note="Lifetime revenue" tone="terra" />
      </section>

      <section className="panel customers-panel" data-aos="fade-up" data-aos-delay="120">
        <div className="panel-heading">
          <div><h2>Customer book</h2><p>{customers.length} shown · members and checkout guests</p></div>
          <button className="text-link" onClick={() => onNavigate('Orders')}>View orders <ArrowUpRight size={14} /></button>
        </div>

        {customers.length === 0 ? (
          <EmptyState icon={Users} title="No customers yet" copy="Members from the shop login and guests who check out will appear here.">
            <a className="ghost-button" href="/shop-login.html" target="_blank" rel="noreferrer">Open customer login <ArrowUpRight size={14} /></a>
          </EmptyState>
        ) : (
          <div className="customer-list">
            <div className="customer-row customer-head">
              <span>Customer</span><span>Orders</span><span>Spend</span><span>Last order</span>
            </div>
            {customers.map(customer => (
              <div className="customer-row" key={customer.email}>
                <div className="customer-person">
                  <span className="customer-avatar">{customer.name.charAt(0).toUpperCase()}</span>
                  <span><b>{customer.name}</b><small>{customer.email}</small></span>
                </div>
                <div className="customer-orders"><b>{customer.orders}</b><span className={`member-pill ${customer.member ? 'member' : ''}`}>{customer.member ? 'Member' : 'Guest'}</span></div>
                <strong className="customer-spend">{money(customer.spend)}</strong>
                <span className="customer-last">{customer.last ? shortDate(customer.last) : 'No orders yet'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function InsightsPage({
  orders, topDrinks, salesData, salesRange, setSalesRange, totalRevenue, totalUnits,
  averageOrder, hotCount, icedCount, signatureCount, memberOrders, guestOrders, onNavigate,
}) {
  const topDrink = topDrinks[0]
  const menuTotal = Math.max(hotCount + icedCount, 1)
  const orderTotal = Math.max(memberOrders + guestOrders, 1)

  return (
    <>
      <section className="stat-grid" data-aos="fade-up" data-aos-delay="80">
        <Stat icon={CircleDollarSign} label="Lifetime revenue" value={money(totalRevenue)} detail={`${orders.length} orders`} note="Since the first checkout" tone="gold" />
        <Stat icon={ShoppingCart} label="Drinks sold" value={totalUnits} unit="cups" detail={`${orders.length} orders`} note="Across the menu" tone="green" />
        <Stat icon={TrendingUp} label="Average order" value={money(averageOrder)} detail="Per checkout" note="All time" tone="blue" />
        <Stat icon={Star} label="Top drink" value={topDrink ? topDrink.name : '—'} detail={topDrink ? `${topDrink.quantity} sold` : 'No sales yet'} note="Best seller" tone="terra" />
      </section>

      <section className="dashboard-grid">
        <div className="panel sales-panel" data-aos="fade-up" data-aos-delay="120">
          <div className="panel-heading">
            <div><h2>Revenue rhythm</h2><p>Daily order value across the selected window</p></div>
            <div className="period-tabs">
              {['7 days', '30 days'].map(option => (
                <button key={option} className={salesRange === option ? 'active' : ''} onClick={() => setSalesRange(option)}>{option}</button>
              ))}
            </div>
          </div>
          <SalesChart data={salesData} range={salesRange} />
          <div className="chart-foot"><span><i className="legend-dot" /> Revenue</span><span>{orders.length} orders included</span></div>
        </div>

        <div className="panel mix-panel" data-aos="fade-up" data-aos-delay="160">
          <div className="panel-heading">
            <div><h2>Menu mix</h2><p>What is on the menu right now</p></div>
            <span className="soft-pill">{menuTotal} drinks</span>
          </div>
          <div className="mix-bar hot"><span>Hot</span><b>{hotCount}</b><i style={{ width: `${(hotCount / menuTotal) * 100}%` }} /></div>
          <div className="mix-bar iced"><span>Iced</span><b>{icedCount}</b><i style={{ width: `${(icedCount / menuTotal) * 100}%` }} /></div>
          <div className="mix-foot"><span><Star size={13} /> {signatureCount} signature drinks</span><button className="text-link" onClick={() => onNavigate('Products')}>View products <ArrowUpRight size={13} /></button></div>
        </div>
      </section>

      <section className="lower-grid">
        <TopDrinksPanel drinks={topDrinks} onNavigate={onNavigate} />
        <div className="panel mix-panel" data-aos="fade-up" data-aos-delay="120">
          <div className="panel-heading">
            <div><h2>Customer mix</h2><p>Members versus checkout guests</p></div>
            <span className="soft-pill">{orderTotal} orders</span>
          </div>
          <div className="mix-bar members"><span>Members</span><b>{memberOrders}</b><i style={{ width: `${(memberOrders / orderTotal) * 100}%` }} /></div>
          <div className="mix-bar guests"><span>Guests</span><b>{guestOrders}</b><i style={{ width: `${(guestOrders / orderTotal) * 100}%` }} /></div>
          <div className="mix-foot"><span><Leaf size={13} /> {orders.length ? `${Math.round((memberOrders / orderTotal) * 100)}% member orders` : 'Waiting for the first order'}</span><button className="text-link" onClick={() => onNavigate('Customers')}>Customers <ArrowUpRight size={13} /></button></div>
        </div>
      </section>
    </>
  )
}

function ProfilePage({
  profile, session, security, orders, accounts, menu, totalRevenue,
  onSaveProfile, onChangePassword, onResetPassword, onNavigate, onCleanData, onLogout,
}) {
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profile)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwVisible, setPwVisible] = useState({})
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(profile)
  }, [profile, editing])

  const initials = (profile.name || 'A').trim().charAt(0).toUpperCase()
  const completed = orders.filter(isComplete).length
  const waiting = orders.length - completed
  const recentOrders = orders.slice(0, 3)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: UserRound },
    { id: 'personal', label: 'Personal information', icon: Mail },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'orders', label: 'Order history', icon: ShoppingBag },
  ]

  const switchTab = id => {
    setTab(id)
    setError('')
    setFlash('')
  }

  const startEdit = () => {
    setDraft(profile)
    setEditing(true)
    switchTab('personal')
  }

  const cancelEdit = () => {
    setDraft(profile)
    setEditing(false)
    setError('')
  }

  const submitProfile = event => {
    event.preventDefault()
    const name = String(draft.name || '').trim()
    const email = String(draft.email || '').trim()
    if (name.length < 2) {
      setError('Enter your name (at least 2 characters).')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    onSaveProfile({ ...draft, name, email })
    setEditing(false)
    setError('')
    setFlash('Your profile details are up to date.')
  }

  const submitPassword = async event => {
    event.preventDefault()
    setError('')
    setFlash('')
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/[0-9]/.test(pw.next)) {
      setError('Use 8+ characters with at least one letter and one number.')
      return
    }
    if (pw.next !== pw.confirm) {
      setError('The new passwords do not match.')
      return
    }
    setPwBusy(true)
    try {
      await onChangePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setFlash('Password updated just now.')
    } catch (changeError) {
      setError(changeError.message || 'Could not update the password.')
    } finally {
      setPwBusy(false)
    }
  }

  const togglePw = key => setPwVisible(current => ({ ...current, [key]: !current[key] }))

  return (
    <div className="profile-page">
      <section className="profile-hero" data-aos="fade-up">
        <span className="profile-hero-glow" aria-hidden="true" />
        <div className="profile-hero-main">
          <span className="profile-avatar">{initials}</span>
          <div className="profile-identity">
            <div className="eyebrow">VER<span>SO</span> COFFEE · ACCOUNT</div>
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
            <div className="profile-badges">
              <span className="status-pill good">Admin access</span>
              <span className="soft-pill"><BadgeCheck size={11} /> {formatJoined(profile.joined)}</span>
            </div>
          </div>
        </div>
        <div className="profile-hero-actions">
          <button className="primary-button" type="button" onClick={startEdit}><Pencil size={15} /> Edit profile</button>
          <button className="ghost-button" type="button" onClick={onLogout}><LogOut size={15} /> Sign out</button>
        </div>
        <div className="profile-hero-stats">
          <div><b>{orders.length}</b><span>Orders handled</span></div>
          <div><b>{money(totalRevenue)}</b><span>Revenue tracked</span></div>
          <div><b>{accounts.length}</b><span>Shop members</span></div>
          <div><b>{menu.length || '—'}</b><span>Drinks on menu</span></div>
        </div>
      </section>

      <div className="profile-layout">
        <aside className="profile-aside" data-aos="fade-up" data-aos-delay="60">
          <div className="profile-summary">
            <span className="profile-avatar small">{initials}</span>
            <b>{profile.name}</b>
            <span className="profile-summary-email">{profile.email}</span>
            <span className="profile-member"><BadgeCheck size={13} /> {formatJoined(profile.joined)}</span>
          </div>
          <nav className="profile-nav" aria-label="Profile sections">
            {tabs.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  className={tab === item.id ? 'active' : ''}
                  onClick={() => switchTab(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {item.id === 'orders' && orders.length > 0 && <i>{orders.length}</i>}
                </button>
              )
            })}
          </nav>
          <div className="profile-contact">
            <span><Phone size={13} /> {profile.phone || 'No phone added'}</span>
            <span><MapPin size={13} /> {profile.location || 'No location added'}</span>
            <span><Briefcase size={13} /> {profile.title || 'Store manager'}</span>
          </div>
        </aside>

        <section className="profile-main" data-aos="fade-up" data-aos-delay="100">
          {flash && <div className="profile-flash"><Check size={14} /> {flash}</div>}

          {tab === 'overview' && (
            <>
              <section className="panel profile-panel">
                <div className="panel-heading">
                  <div><h2>Personal information</h2><p>How your account appears across the dashboard.</p></div>
                  <button className="text-link" type="button" onClick={startEdit}>Edit <ArrowUpRight size={13} /></button>
                </div>
                <div className="profile-info-grid">
                  <InfoCard icon={UserRound} label="Full name" value={profile.name} />
                  <InfoCard icon={Mail} label="Email address" value={profile.email} />
                  <InfoCard icon={Phone} label="Phone" value={profile.phone || 'Not added'} />
                  <InfoCard icon={MapPin} label="Location" value={profile.location || 'Not added'} />
                </div>
                <p className="profile-bio">{profile.bio || 'Add a short note about your role at VERSO Coffee.'}</p>
              </section>

              <div className="profile-columns">
                <section className="panel profile-panel">
                  <div className="panel-heading">
                    <div><h2>Membership</h2><p>Your VERSO Coffee account status.</p></div>
                    <span className="status-pill good">Active</span>
                  </div>
                  <div className="profile-membership">
                    <div><span>Plan</span><b>Store admin</b></div>
                    <div><span>Member since</span><b>{formatJoined(profile.joined)}</b></div>
                    <div><span>Role</span><b>{profile.title || 'Store manager'}</b></div>
                    <div><span>Email</span><b>{profile.email}</b></div>
                  </div>
                </section>

                <section className="panel profile-panel">
                  <div className="panel-heading">
                    <div><h2>Recent orders</h2><p>The latest pickups in your store.</p></div>
                    <button className="text-link" type="button" onClick={() => switchTab('orders')}>History <ArrowUpRight size={13} /></button>
                  </div>
                  {recentOrders.length ? (
                    <OrderList orders={recentOrders} compact />
                  ) : (
                    <EmptyState icon={ShoppingBag} title="No orders yet" copy="Customer checkouts will appear here as soon as the first bag is paid for.">
                      <button className="ghost-button" type="button" onClick={() => onNavigate('Orders')}>Open orders</button>
                    </EmptyState>
                  )}
                </section>
              </div>
            </>
          )}

          {tab === 'personal' && (
            <section className="panel profile-panel">
              <div className="panel-heading">
                <div><h2>Personal information</h2><p>Keep your account details accurate and up to date.</p></div>
                {!editing && <button className="text-link" type="button" onClick={startEdit}>Edit <Pencil size={12} /></button>}
              </div>
              {editing ? (
                <form className="profile-form" onSubmit={submitProfile}>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Full name</span>
                      <input value={draft.name || ''} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Your full name" autoComplete="name" />
                    </label>
                    <label className="form-field">
                      <span>Email address</span>
                      <input value={draft.email || ''} onChange={event => setDraft({ ...draft, email: event.target.value })} placeholder="you@verso.coffee" autoComplete="email" />
                    </label>
                    <label className="form-field">
                      <span>Phone</span>
                      <input value={draft.phone || ''} onChange={event => setDraft({ ...draft, phone: event.target.value })} placeholder="+855 12 345 678" autoComplete="tel" />
                    </label>
                    <label className="form-field">
                      <span>Location</span>
                      <input value={draft.location || ''} onChange={event => setDraft({ ...draft, location: event.target.value })} placeholder="Street 240, Phnom Penh" />
                    </label>
                    <label className="form-field full">
                      <span>Role / title</span>
                      <input value={draft.title || ''} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Store manager" />
                    </label>
                    <label className="form-field full">
                      <span>Short bio</span>
                      <textarea rows="3" value={draft.bio || ''} onChange={event => setDraft({ ...draft, bio: event.target.value })} placeholder="A short note about your role." />
                    </label>
                  </div>
                  {error && <p className="form-error">{error}</p>}
                  <div className="profile-form-actions">
                    <button className="ghost-button" type="button" onClick={cancelEdit}>Cancel</button>
                    <button className="primary-button" type="submit"><Save size={15} /> Save changes</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="profile-info-grid">
                    <InfoCard icon={UserRound} label="Full name" value={profile.name} />
                    <InfoCard icon={Mail} label="Email address" value={profile.email} />
                    <InfoCard icon={Phone} label="Phone" value={profile.phone || 'Not added'} />
                    <InfoCard icon={MapPin} label="Location" value={profile.location || 'Not added'} />
                    <InfoCard icon={Briefcase} label="Role" value={profile.title || 'Store manager'} />
                    <InfoCard icon={CalendarDays} label="Member since" value={formatJoined(profile.joined)} />
                  </div>
                  <p className="profile-bio">{profile.bio || 'Add a short note about your role at VERSO Coffee.'}</p>
                </>
              )}
            </section>
          )}

          {tab === 'security' && (
            <>
              <section className="panel profile-panel">
                <div className="panel-heading">
                  <div><h2>Password management</h2><p>Update the password used for the admin sign-in.</p></div>
                  <span className="soft-pill"><KeyRound size={11} /> Server session</span>
                </div>
                <form className="profile-form" onSubmit={submitPassword}>
                  <div className="form-grid">
                    <PasswordField
                      id="currentPassword"
                      label="Current password"
                      value={pw.current}
                      visible={Boolean(pwVisible.current)}
                      onToggle={() => togglePw('current')}
                      onChange={value => { setPw({ ...pw, current: value }); setError('') }}
                      autoComplete="current-password"
                      placeholder="Enter your current password"
                    />
                    <PasswordField
                      id="newPassword"
                      label="New password"
                      value={pw.next}
                      visible={Boolean(pwVisible.next)}
                      onToggle={() => togglePw('next')}
                      onChange={value => { setPw({ ...pw, next: value }); setError('') }}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                    />
                    <PasswordField
                      id="confirmPassword"
                      label="Confirm new password"
                      value={pw.confirm}
                      visible={Boolean(pwVisible.confirm)}
                      onToggle={() => togglePw('confirm')}
                      onChange={value => { setPw({ ...pw, confirm: value }); setError('') }}
                      autoComplete="new-password"
                      placeholder="Repeat the new password"
                    />
                  </div>
                  <p className="form-note">Use 8+ characters with at least one letter and one number. The initial password from the server environment stays available after a reset.</p>
                  {error && <p className="form-error">{error}</p>}
                  <div className="profile-form-actions">
                    <span className="form-note">{security.updatedAt ? `Updated ${shortDate(security.updatedAt)}` : 'Using the initial admin password.'}</span>
                    <button className="primary-button" type="submit" disabled={pwBusy}>
                      <Lock size={15} /> {pwBusy ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </form>
                <div className="profile-security-actions">
                  <button className="ghost-button" type="button" onClick={onResetPassword}><RotateCcw size={14} /> Reset to initial password</button>
                </div>
              </section>

              <section className="panel profile-panel">
                <div className="panel-heading">
                  <div><h2>Session & local data</h2><p>This demo keeps everything in your browser.</p></div>
                  <span className="soft-pill">Localhost</span>
                </div>
                <div className="profile-membership">
                  <div><span>Role</span><b>{session?.role || 'admin'}</b></div>
                  <div><span>Signed in</span><b>{session?.mode === 'login' ? 'Password sign-in' : 'Local session'}</b></div>
                  <div><span>Session started</span><b>{session?.at ? orderTime(session.at) : 'This session'}</b></div>
                  <div><span>Storage</span><b>Browser localStorage</b></div>
                </div>
                <div className="profile-security-actions">
                  <button className="ghost-button danger-button" type="button" onClick={onCleanData}><RotateCcw size={14} /> Clean local demo data</button>
                </div>
              </section>
            </>
          )}

          {tab === 'orders' && (
            <section className="panel profile-panel">
              <div className="panel-heading">
                <div><h2>Order history</h2><p>{orders.length} order{orders.length === 1 ? '' : 's'} · {waiting} waiting · {completed} completed</p></div>
                <button className="ghost-button small" type="button" onClick={() => onNavigate('Orders')}>Manage orders <ArrowUpRight size={13} /></button>
              </div>
              {orders.length ? (
                <OrderList orders={orders} />
              ) : (
                <EmptyState icon={ShoppingBag} title="Your first order is waiting" copy="When a customer checks out, the order lands here and in the live order queue.">
                  <button className="ghost-button" type="button" onClick={() => onNavigate('Orders')}>Open order queue</button>
                </EmptyState>
              )}
            </section>
          )}
        </section>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <article className="profile-info-card">
      <span className="profile-info-icon"><Icon size={16} /></span>
      <div><span>{label}</span><b>{value}</b></div>
    </article>
  )
}

function PasswordField({ id, label, value, visible, onToggle, onChange, autoComplete, placeholder }) {
  return (
    <label className="form-field full" htmlFor={id}>
      <span>{label}</span>
      <div className="password-input">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'}>
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </label>
  )
}

function OrderList({ orders, compact }) {
  return (
    <div className={`profile-orders ${compact ? 'compact' : ''}`}>
      {orders.map(order => {
        const items = orderItems(order)
        const units = orderUnits(order)
        const done = isComplete(order)
        return (
          <article className="profile-order" key={order.id}>
            <div className="profile-order-top">
              <div>
                <b>{order.customer?.name || 'Guest'}</b>
                <span>{order.customer?.email || 'Walk-in customer'}</span>
              </div>
              <span className={`status-pill ${done ? 'good' : 'new'}`}>{done ? 'Completed' : 'New'}</span>
            </div>
            <div className="profile-order-items">
              {items.slice(0, 3).map((item, index) => (
                <span key={`${order.id}-${index}`}>{item.quantity}× {item.title}</span>
              ))}
              {items.length > 3 && <span>+{items.length - 3} more</span>}
              {!items.length && <span>No items listed</span>}
            </div>
            <div className="profile-order-foot">
              <span><Clock size={12} /> {orderTime(order.createdAt)}</span>
              <span>{units} cup{units === 1 ? '' : 's'}</span>
              <b>{money(order.total)}</b>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function SettingsPage({ settings, session, profile, onOpenProfile, onSave, onCleanData, notify }) {
  const [draft, setDraft] = useState(settings)
  useEffect(() => { setDraft(settings) }, [settings])

  const submit = event => {
    event.preventDefault()
    onSave({
      ...draft,
      storeName: draft.storeName.trim() || defaultSettings.storeName,
      pickup: draft.pickup.trim() || defaultSettings.pickup,
      hours: draft.hours.trim() || defaultSettings.hours,
    })
  }

  return (
    <form className="settings-grid" onSubmit={submit}>
      <div className="panel settings-main" data-aos="fade-up" data-aos-delay="80">
        <div className="panel-heading">
          <div><h2>Store details</h2><p>These details are used around the customer shop.</p></div>
          <span className="soft-pill">Local demo</span>
        </div>
        <div className="form-grid">
          <label className="form-field">
            <span>Store name</span>
            <input value={draft.storeName} onChange={event => setDraft({ ...draft, storeName: event.target.value })} placeholder="VERSO Coffee Roasters" />
          </label>
          <label className="form-field">
            <span>Opening hours</span>
            <input value={draft.hours} onChange={event => setDraft({ ...draft, hours: event.target.value })} placeholder="07:00 – 18:00" />
          </label>
          <label className="form-field full">
            <span>Pickup location</span>
            <input value={draft.pickup} onChange={event => setDraft({ ...draft, pickup: event.target.value })} placeholder="Street 240, Phnom Penh" />
          </label>
          <label className="form-field full">
            <span>Shop announcement</span>
            <textarea rows="3" value={draft.announcement} onChange={event => setDraft({ ...draft, announcement: event.target.value })} placeholder="A short note for customers." />
          </label>
        </div>
        <div className="settings-actions">
          <span><Check size={14} /> Settings save in this browser.</span>
          <button className="primary-button" type="submit"><Save size={15} /> Save changes</button>
        </div>
      </div>

      <aside className="settings-side">
        <div className="panel" data-aos="fade-up" data-aos-delay="120">
          <div className="panel-heading">
            <div><h2>Ordering</h2><p>Pause or resume checkout in the customer shop.</p></div>
          </div>
          <button
            className={`order-switch ${draft.acceptingOrders ? 'on' : ''}`}
            type="button"
            onClick={() => setDraft({ ...draft, acceptingOrders: !draft.acceptingOrders })}
          >
            <span className="toggle"><span /></span>
            <span><b>{draft.acceptingOrders ? 'Accepting orders' : 'Ordering paused'}</b><small>{draft.acceptingOrders ? 'Customers can check out' : 'Checkout will be blocked'}</small></span>
            {draft.acceptingOrders ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
          </button>
          <p className="form-note">Save changes to apply this to the storefront.</p>
        </div>

        <div className="panel admin-card" data-aos="fade-up" data-aos-delay="160">
          <div className="panel-heading">
            <div><h2>Admin account</h2><p>The signed-in dashboard account.</p></div>
          </div>
          <div className="admin-row">
            <span className="customer-avatar">{(profile?.name || session?.name || 'A').charAt(0).toUpperCase()}</span>
            <span><b>{profile?.name || session?.name || 'Admin'}</b><small>{profile?.email || session?.email || 'admin@coffee.com'}</small></span>
            <span className="status-pill good">Admin</span>
          </div>
          <button className="ghost-button full-width" type="button" onClick={onOpenProfile}>
            <UserRound size={14} /> Open profile
          </button>
          <button className="ghost-button full-width" type="button" onClick={() => notify('Admin credentials are demo-only. Use the details on the login page.')}>
            Manage credentials
          </button>
          <button className="ghost-button full-width danger-button" type="button" onClick={onCleanData}>
            <RotateCcw size={14} /> Clean local demo data
          </button>
          <p className="form-note">Removes orders, customers, cart, sold-out drinks, photos and settings from this browser. You stay signed in.</p>
        </div>
      </aside>
    </form>
  )
}

function SalesChart({ data, range }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c69b52" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#c69b52" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e3dacb" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#8a8f85', fontSize: 10 }} axisLine={false} tickLine={false} interval={range === '30 days' ? 4 : 0} />
          <YAxis tick={{ fill: '#8a8f85', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={value => `$${value}`} />
          <Tooltip
            contentStyle={{ background: '#fffdf8', border: '1px solid #d8d0c2', borderRadius: 12, color: '#18332d', boxShadow: '0 12px 30px rgba(0,25,19,.1)' }}
            labelStyle={{ color: '#7c837b', fontSize: 11 }}
            formatter={value => [money(value), 'Revenue']}
          />
          <Area type="monotone" dataKey="revenue" stroke="#0b5143" strokeWidth={2.5} fill="url(#salesFill)" activeDot={{ r: 5, fill: '#c69b52', stroke: '#fffdf8', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function TopDrinksPanel({ drinks, onNavigate }) {
  const max = Math.max(...drinks.map(drink => drink.quantity), 1)
  return (
    <div className="panel top-drinks" data-aos="fade-up" data-aos-delay="160">
      <div className="panel-heading">
        <div><h2>Top drinks</h2><p>Best sellers by cups sold</p></div>
        <span className="soft-pill">{drinks.length} ranked</span>
      </div>
      {drinks.length === 0 ? (
        <div className="empty-compact">
          <Coffee size={20} />
          <div><b>No sales yet</b><span>The first checkout will start the ranking.</span></div>
        </div>
      ) : (
        <div className="rank-list">
          {drinks.map((drink, index) => (
            <div className="rank-row" key={drink.name}>
              <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
              <div className="rank-main">
                <div><b>{drink.name}</b><span>{drink.quantity} sold</span></div>
                <div className="rank-track"><i style={{ width: `${(drink.quantity / max) * 100}%` }} /></div>
              </div>
              <strong>{money(drink.revenue)}</strong>
            </div>
          ))}
        </div>
      )}
      <button className="text-link" onClick={() => onNavigate('Products')}>Browse full menu <ArrowUpRight size={14} /></button>
    </div>
  )
}

function OrderCard({ order, pickup, onComplete, onStatusChange }) {
  const status = orderStatus(order)
  const meta = STATUS_META[status]
  const completed = isComplete(order)
  const cancelled = isCancelled(order)
  const customer = order.customer || {}
  return (
    <article className={`order-card ${completed ? 'is-complete' : ''} ${cancelled ? 'is-cancelled' : ''}`}>
      <div className="order-head">
        <div className="order-badge-row">
          <span className={`status-pill ${meta.tone}`}>{meta.label}</span>
          <b>{order.id}</b>
          <small>{orderTime(order.createdAt)}</small>
        </div>
        <strong>{money(order.total)}</strong>
      </div>
      <div className="order-customer">
        <span className="order-avatar">{(customer.name || 'G').charAt(0).toUpperCase()}</span>
        <div><b>{customer.name || 'Guest'}</b><small>{customer.email || 'Coffee shop customer'}</small></div>
        <span>{orderUnits(order)} item{orderUnits(order) === 1 ? '' : 's'}</span>
      </div>
      <ul className="order-lines">
        {orderItems(order).map((item, index) => (
          <li key={`${order.id}-${item.id || item.title}-${index}`}>
            <span><i>{item.quantity}×</i> {item.title}</span>
            <b>{money(Number(item.price || 0) * Number(item.quantity || 0))}</b>
          </li>
        ))}
      </ul>
      <div className="order-foot">
        <span className="order-pickup"><MapPin size={13} /> Pickup · {pickup}</span>
        <div className="order-status-actions">
          <label className="status-select">
            <span>Status</span>
            <select value={status} onChange={event => onStatusChange(order.id, event.target.value)}>
              {Object.entries(STATUS_META).map(([value, option]) => (
                <option key={value} value={value}>{option.label}</option>
              ))}
            </select>
          </label>
          {completed
            ? <span className="done-label"><CheckCircle2 size={14} /> Completed</span>
            : cancelled
              ? <span className="done-label cancelled-label"><XCircle size={14} /> Cancelled</span>
              : <button className="ghost-button small" onClick={() => onComplete(order.id)}><CheckCircle2 size={14} /> Mark completed</button>}
        </div>
      </div>
    </article>
  )
}

function RecentOrder({ order, onOpen }) {
  const customer = order.customer || {}
  const meta = STATUS_META[orderStatus(order)]
  return (
    <button className="recent-order" onClick={onOpen}>
      <span className="recent-avatar">{(customer.name || 'G').charAt(0).toUpperCase()}</span>
      <span className="recent-main"><b>{customer.name || 'Guest'}</b><small>{orderUnits(order)} item{orderUnits(order) === 1 ? '' : 's'} · {orderTime(order.createdAt)}</small></span>
      <span className={`status-pill ${meta.tone}`}>{meta.label}</span>
      <strong>{money(order.total)}</strong>
    </button>
  )
}

function Stat({ icon: Icon, label, value, unit, detail, note, tone }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span className={`stat-icon ${tone}`}><Icon size={18} /></span>
        <span className="stat-detail">{detail}</span>
      </div>
      <div className="stat-value">{value}<small>{unit}</small></div>
      <div className="stat-label">{label}</div>
      <p className="stat-note">{note}</p>
    </article>
  )
}

function EmptyState({ icon: Icon, title, copy, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={24} /></span>
      <b>{title}</b>
      <p>{copy}</p>
      {children}
    </div>
  )
}

export default App
