# VERSO Coffee — Storefront & Admin Dashboard

A responsive coffee-shop storefront and matching admin dashboard built with React, Vite, Tailwind CSS v4, Recharts, AOS scroll animations, and Lucide icons.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build

```bash
npm run build
npm run preview
```

## Admin dashboard

Visitors who open `/` without an admin session are sent to the customer create-account page at `/shop-login.html?mode=signup`. Staff can open the admin sign-in page directly at `/login.html`.

- Demo admin email: `admin@verso.coffee`
- Demo admin password: `haven123`

A successful sign-in saves `{ role: "admin" }` to `localStorage` under `verso_session` and opens the dashboard. Any other session is redirected back to the admin login, and the sidebar log-out button clears it.

The dashboard matches the VERSO Coffee storefront with a cream, deep-green and gold theme. It includes:

- **Overview** — today's revenue, new orders, drinks sold, recent orders, top drinks, sales chart and store status
- **Orders** — live order queue with new/completed filters, search, mark completed and complete all
- **Menu** — live SampleAPIs coffee menu with category filters and availability controls; sold-out drinks are reflected in the storefront
- **Customers** — registered shop members and checkout guests with order counts, spend and last order
- **Insights** — 7/30-day revenue chart, top drinks, menu mix and member-versus-guest mix
- **Settings** — store name, pickup location, opening hours, announcement and online-ordering pause/resume

Orders are stored under `verso_coffee_orders`; menu availability under `verso_coffee_sold_out`; store settings under `verso_coffee_settings`. Demand-driven sections update automatically as new orders arrive.

## Customer login (VERSO Coffee)

The coffee shop at `/shop.html` requires a customer session. Visitors without one are redirected to `/shop-login.html`, which supports sign-in and account creation.

- Demo member email: `guest@verso.coffee`
- Demo member password: `coffee123`

Customer accounts are stored locally under `verso_coffee_accounts` (passwords are SHA-256 hashed in the browser), and the active session is saved under `verso_coffee_user` with `role: "customer"`. Use the account chip in the shop header to sign out.

Admin and customer sessions are separate: `verso_session` (role `admin`) gates the dashboard, and `verso_coffee_user` (role `customer`) gates the shop. A customer session cannot open the dashboard, and signing into one does not affect the other.

Both auth flows are front-end demos only; replace them with a real backend before production.

## Coffee shop storefront

The standalone VERSO Coffee storefront is served at `/shop.html`.

- Loads drinks from the public SampleAPIs coffee endpoints (`hot` and `iced`), with a built-in fallback menu if the API is unavailable
- Search, filter by hot/iced/recommended, and sort the menu
- Quick-view product modal and a slide-out bag/cart
- Cart persists in `localStorage` under `verso_coffee_cart`
- Customer sign-in/sign-up, account chip and sign-out
- Checkout creates an order for the admin dashboard and clears the bag
- Reads the admin store settings and sold-out list, showing a shop status banner and blocking checkout when ordering is paused
- Every checkout creates a new order under `verso_coffee_orders` for the admin dashboard

The API does not include prices, so the demo derives a stable price per drink. To use a different product API, update the `API` constant in the storefront script and map the response in `normalize`.

## Included interactions

- Dedicated Overview, Orders, Menu, Customers, Insights and Settings admin pages
- AOS scroll animations on dashboard sections
- Responsive sidebar navigation and mobile drawer
- Search orders, customers and the live menu
- Toggle drink availability, with sold-out state shared with the storefront
- Pause/resume online ordering from the dashboard or Overview
- Mark orders completed individually or all at once
- Store settings saved in the browser and used by the shop
- Deep links via the URL hash (for example `#orders`)
- Notification feedback toast

The dashboard and storefront currently use sample data and browser storage. Connect a backend/API for real accounts, payments and persistent orders.
