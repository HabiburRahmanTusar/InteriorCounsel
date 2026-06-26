# MongoDB Setup Guide

Configure the API to connect to either a local MongoDB instance (via Compass) or a cloud MongoDB Atlas cluster. All settings are controlled via environment variables.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Either MongoDB installed locally **or** a MongoDB Atlas account

## Quick Start

```bash
# From apps/api/
cp .env.example .env
# Edit .env and set MONGODB_URI (see options below)
npm install
npm run dev
```

## Environment File

The API loads configuration from `.env` located in `apps/api/`.

| Variable | Purpose | Default |
|---|---|---|
| `MONGODB_URI` | Full MongoDB connection string | `mongodb://localhost:27017/workforce_management` |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | Timeout for server selection | `10000` |
| `MONGODB_MAX_POOL_SIZE` | Max connections in the pool | `50` |

> **Note:** `.env` is ignored by Git. `.env.example` is checked in as a reference.

---

## Option A: MongoDB Compass (Local)

Use this if you run MongoDB on your local machine and connect to it with MongoDB Compass.

### 1. Install / start MongoDB locally

- **macOS (Homebrew):** `brew install mongodb-community && brew services start mongodb-community`
- **Windows:** Use the MSI installer or Docker: `docker run -d -p 27017:27017 mongo:latest`
- **Linux:** Follow the [official guide](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)

Verify it is running:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

### 2. Configure `.env`

```env
# Default: no auth, localhost
MONGODB_URI=mongodb://localhost:27017/workforce_management

# If your local MongoDB requires auth:
# MONGODB_URI=mongodb://<USERNAME>:<PASSWORD>@localhost:27017/workforce_management?authSource=admin
```

### 3. Compass connection

In Compass, use the same URI:

- Without auth: `mongodb://localhost:27017`
- With auth: `mongodb://<USERNAME>:<PASSWORD>@localhost:27017/workforce_management?authSource=admin`

---

## Option B: MongoDB Atlas (Cloud)

Use this if you want a managed MongoDB cluster in the cloud.

### 1. Create an Atlas account and cluster

1. Sign up at https://www.mongodb.com/atlas/database
2. Create a project and a shared/Dev cluster (free tier works for development)
3. Create a database user (username + password) under **Database Access**
4. Whitelist your IP under **Network Access** (or allow `0.0.0.0/0` in development)

### 2. Get the connection string

1. In Atlas, click **Connect** on your cluster
2. Choose **Connect your application**
3. Select **Node.js** and copy the URI

Example Atlas URI format:

```
mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.abcd1234.mongodb.net/?retryWrites=true&w=majority
```

### 3. Configure `.env`

```env
# Atlas connection — add the database name and any options you need
MONGODB_URI=mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.abcd1234.mongodb.net/workforce_management?retryWrites=true&w=majority
```

> **Important:** Do not commit real credentials to version control.

### 4. Compass connection (optional)

You can also connect Compass to your Atlas cluster:

- Driver: **Node.js** (or MongoDB Shell)
- SRV record: **checked** (recommended)
- Paste the same `MONGODB_URI` from above

---

## Configuration Reference

### Tuning Connection Behavior

Edit these in `.env` if needed:

```env
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
MONGODB_MAX_POOL_SIZE=50
```

### Verifying the Connection

Start the API and look for this log line:

```
MongoDB connected
```

If you see `MongoDB disconnected` or `MongoDB error`, check:

1. Is the URI correct?
2. Does your IP have access (Atlas)?
3. Is the database user password correct?
4. Is MongoDB running locally?

### Switching Environments

For production, set `NODE_ENV=production` and use your production Atlas URI:

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://prod_user:strong_password@cluster0.prod.mongodb.net/workforce_production?retryWrites=true&w=majority
```
