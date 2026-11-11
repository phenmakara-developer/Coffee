# VERSO Coffee — Storefront & Admin Dashboard

A responsive coffee-shop storefront and matching admin dashboard built with React, Vite, Tailwind CSS v4, Recharts, AOS scroll animations, and Lucide icons.

## Run locally

```bash
npm install
copy .env.example .env
npm run dev:all
```

`dev:all` runs the Vite frontend and the Express admin API together. Open `http://localhost:5180` (or go straight to `http://localhost:5180/login.html` for the admin sign-in).

`npm run dev` starts **only** the Vite frontend, so the `/api` proxy will fail with `ECONNREFUSED` unless the API is also running. Use `npm run dev:all`, or run `npm run dev:api` in a second terminal. The API listens on `http://localhost:4000` (configured by `PORT` in `.env`), and Vite proxies `/api` to it.

## Production build

```bash
npm run build
npm start
```

The Express server serves the built `dist/` folder. `/admin` and `/admin/dashboard` require an admin session; unauthenticated visitors are redirected to `/admin/login`. Set `NODE_ENV=production` and `COOKIE_SECURE=true` when serving over HTTPS.

## Admin authentication

Admin sign-in is handled by the backend in `server/index.js`. The initial credentials are read from environment variables and never placed in frontend code. On first start the server stores a bcrypt hash in `server/data/admin.json` (gitignored), and later password changes are written there.

1. Copy `.env.example` to `.env`.
2. Set `ADMIN_EMAIL` (for example `admin@coffee.com`).
3. Set the initial password with either `ADMIN_PASSWORD` or a bcrypt `ADMIN_PASSWORD_HASH`.
4. Set a long random `SESSION_SECRET`.
5. Optional: generate a hash with `npm run hash-password -- "your-password"`.
6. Optional: reset the stored account from `.env` with `npm run seed-admin`.

The admin account and initial password are:

- **Email:** `admin@coffee.com`
- **Password:** the value of `ADMIN_PASSWORD` in your `.env` (or whatever password matches `ADMIN_PASSWORD_HASH`)

Open `/admin/login`, enter those credentials, and press **Open dashboard**. The server verifies the password, creates an HTTP-only session cookie, and protects every admin route. Visitors without an admin session are redirected to `/admin/login`, while the JSON API returns `401`. Sign-in supports "Remember me" (30 days) and is rate limited after repeated failures. The sidebar and Profile page include a Sign out button that destroys the server session.

Password changes made in **Profile → Security** are persisted in `server/data/admin.json`. Customer accounts (`verso_coffee_user`) are separate and cannot access the admin dashboard.

The dashboard matches the VERSO Coffee storefront with a cream, deep-green and gold theme. It includes:

- **Dashboard** – total revenue, orders, products and customers, live order-status overview, recent orders, top products, sales chart and store status
- **Products** – coffee catalog with photos, prices, categories, descriptions and availability; sold-out drinks are reflected in the storefront
- **Categories** – create, edit and delete product categories
- **Orders** – live order queue with new/preparing/ready/completed/cancelled statuses, search, mark completed and complete all
- **Customers** – registered shop members and checkout guests with order counts, spend and last order
- **Payments** – collected, pending and refunded totals with a per-order payment list
- **Reports** – 7/30-day revenue chart, top products, product mix and member-versus-guest mix
- **Settings** – store name, pickup location, opening hours, announcement and online-ordering pause/resume

Orders are stored under `verso_coffee_orders`; products under `verso_coffee_products`; categories under `verso_coffee_categories`; menu availability under `verso_coffee_sold_out`; store settings under `verso_coffee_settings`. Demand-driven sections update automatically as new orders arrive.

## Customer login (VERSO Coffee)

The coffee shop at `/shop.html` requires a customer session. Visitors without one are redirected to `/shop-login.html`, which supports sign-in and account creation.

Customer accounts are stored locally under `verso_coffee_accounts` (passwords are SHA-256 hashed in the browser), and the active session is saved under `verso_coffee_user` with `role: "customer"`. Use the account chip in the shop header to sign out.

Admin and customer sessions are separate: the server-side admin cookie gates the dashboard, and `verso_coffee_user` (role `customer`) gates the shop. A customer session cannot open the dashboard, and signing into one does not affect the other.

The customer flow still runs entirely in the browser; connect it to a real backend before production.

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

- Dedicated Dashboard, Products, Categories, Orders, Customers, Payments, Reports and Settings admin pages
- AOS scroll animations on dashboard sections
- Responsive sidebar navigation and mobile drawer
- Search orders, customers and the product catalog
- Create, edit and delete products and categories
- Toggle drink availability, with sold-out state shared with the storefront
- Update order status individually or complete all open orders
- Pause/resume online ordering from the dashboard or Dashboard page
- Store settings saved in the browser and used by the shop
- Deep links via the URL hash (for example `#orders`)
- Notification feedback toast

The dashboard and storefront currently use sample data and browser storage. Connect a backend/API for real accounts, payments and persistent orders.
