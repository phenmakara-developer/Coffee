import {
  LayoutDashboard, Coffee, Tags, ShoppingBag, Users, CreditCard, BarChart3, Settings,
} from 'lucide-react'

export const nav = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Products', icon: Coffee },
  { label: 'Categories', icon: Tags },
  { label: 'Orders', icon: ShoppingBag },
  { label: 'Customers', icon: Users },
  { label: 'Payments', icon: CreditCard },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
]

export const API = {
  Hot: 'https://api.sampleapis.com/coffee/hot',
  Iced: 'https://api.sampleapis.com/coffee/iced',
}

export const HOUSE_MENU = [
  {
    id: 'house-salted-caramel-latte',
    title: 'Salted Caramel Latte',
    description: 'Double espresso, steamed oat milk and house caramel, finished with a pinch of flaky sea salt.',
    ingredients: ['Coffee', 'Oat milk', 'Caramel', 'Sea salt'],
    image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=900&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=900&q=80',
    category: 'Hot',
    price: 4.75,
    signature: true,
  },
]

export const FALLBACK_MENU = [
  { title: 'House Espresso', description: 'Our everyday blend pulled short and sweet — chocolate, toasted almond and a clean finish.', ingredients: ['Coffee'], image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=900&q=80' },
  { title: 'Flat White', description: 'Double ristretto with silky steamed milk and a thin layer of microfoam.', ingredients: ['Coffee', 'Milk'], image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=900&q=80' },
  { title: 'Cappuccino', description: 'Equal parts espresso, steamed milk and airy foam, finished with cocoa.', ingredients: ['Coffee', 'Milk', 'Cocoa'], image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=900&q=80' },
  { title: 'Iced Latte', description: 'Chilled milk, a double shot and plenty of ice for a slow, easy afternoon.', ingredients: ['Coffee', 'Milk', 'Ice'], image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80' },
  { title: 'Cold Brew', description: 'Steeped for eighteen hours for a rounded, low-acid cup with a cocoa finish.', ingredients: ['Coffee', 'Water', 'Ice'], image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=900&q=80' },
  { title: 'Mocha', description: 'Espresso, dark chocolate and steamed milk — dessert that counts as coffee.', ingredients: ['Coffee', 'Milk', 'Chocolate'], image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=900&q=80' },
]

export const defaultSettings = {
  storeName: 'VERSO Coffee Roasters',
  pickup: 'Street 240, Phnom Penh',
  hours: '07:00 – 18:00',
  acceptingOrders: true,
  announcement: 'Oat milk is always free. Bring a reusable cup for 10% off.',
}

export const defaultCategories = [
  { id: 'hot', name: 'Hot', description: 'Espresso bar and warm drinks' },
  { id: 'iced', name: 'Iced', description: 'Cold bar served over ice' },
]

export const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#eee6d8"/><g fill="none" stroke="#c69b52" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M120 120h130v60a55 55 0 0 1-55 55h-20a55 55 0 0 1-55-55v-60Z"/><path d="M250 135h25a28 28 0 0 1 0 56h-25"/><path d="M150 90c-10-12 10-20 0-32M185 90c-10-12 10-20 0-32M220 90c-10-12 10-20 0-32"/></g></svg>',
)
