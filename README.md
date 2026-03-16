# Procurement Workflow MERN App

Procurement workflow app para sa:

`Purchase Request -> Review -> Approval -> Supplier Selection -> Prepare PO -> Approve PO -> Send PO -> Delivery -> Inspection -> Invoice -> Matching -> Payment -> Filing`

## Stack

- React + Vite frontend for Vercel
- Express + MongoDB backend for Render
- JWT authentication
- Role-based approvals per workflow stage

## Features

- Create purchase requests with category, priority, date needed, delivery address, and payment terms
- Track supplier, PO number, invoice number, inspection result, and payment reference
- Move requests through the full procurement lifecycle with stage-based role permissions
- Persist all requests and history in MongoDB

## Local setup

1. Install dependencies:

```bash
npm run install:all
```

2. Create environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Ready-to-copy templates are also in [`/.env.templates.md`](/Users/jerryaustria/Documents/Januarius-app/.env.templates.md).

3. Set your MongoDB connection in `server/.env`.

4. Seed demo data:

```bash
npm run seed --prefix server
```

5. Start the backend:

```bash
npm run dev:server
```

6. Start the frontend:

```bash
npm run dev:client
```

## Demo accounts

Lahat gumagamit ng password na `password123`:

- `requester@januarius.app`
- `reviewer@januarius.app`
- `approver@januarius.app`
- `procurement@januarius.app`
- `receiver@januarius.app`
- `inspector@januarius.app`
- `finance@januarius.app`
- `accountant@januarius.app`
- `treasury@januarius.app`
- `filing@januarius.app`
- `admin@januarius.app`

## Deploy

### Frontend on Vercel

Set Vercel project root to `client` and add:

- `VITE_API_URL=https://your-render-service.onrender.com/api`

The file `client/vercel.json` already rewrites routes to `index.html`.

### Backend on Render

You can create the service manually or use [`render.yaml`](/Users/jerryaustria/Documents/Januarius-app/render.yaml).

Required environment variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN=https://your-vercel-app.vercel.app`

See [`/.env.templates.md`](/Users/jerryaustria/Documents/Januarius-app/.env.templates.md) for copy-paste examples for local, Vercel, and Render.

## Important files

- [`client/src/App.jsx`](/Users/jerryaustria/Documents/Januarius-app/client/src/App.jsx)
- [`server/routes/workflows.js`](/Users/jerryaustria/Documents/Januarius-app/server/routes/workflows.js)
- [`server/models/PurchaseRequest.js`](/Users/jerryaustria/Documents/Januarius-app/server/models/PurchaseRequest.js)
- [`server/config/workflow.js`](/Users/jerryaustria/Documents/Januarius-app/server/config/workflow.js)
- [`server/seed.js`](/Users/jerryaustria/Documents/Januarius-app/server/seed.js)
