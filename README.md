# Toll Router OSS

A high-performance, local-first API gateway and industrial control-panel router designed for minimal resource usage. The Open Source (OSS) edition of Toll Router focuses on core routing and policy enforcement features.

Toll Router OSS runs entirely in-memory and executes completely local-first. There are no cloud dependencies, no external databases, no telemetry, and no enterprise clutter. It is meant to serve as a fast runtime to sit in front of APIs, block unwanted traffic, and monitor operations.

## Features

- **Local-First Architecture:** Runs entirely in-memory without the need for a database.
- **Traffic Interception:** Built-in middleware to analyze and proxy requests.
- **Governance Policies:** Allows real-time creation of block, allow, and token-bucket rate limit policies targeting IP addresses, request paths, or API keys.
- **Real-Time Monitoring:** Beautiful, high-density industrial control panel dashboard for viewing simulated & live traffics, status, and latency.
- **Audit Logging:** Keeps track of critical configuration changes (e.g. creating/deleting policies).
- **In-Memory Query Engine:** Search through logs and policies easily without an external database.

## Installation & Usage

Make sure you have Node.js installed. Then, clone the repository and run:

```bash
# Install dependencies
npm install

# Start the application in development mode
npm run dev
```

The application will start a local server on port 3000. Open `http://localhost:3000` in your browser.

**To build for production:**
```bash
npm run build
npm run start
```

## Tech Stack

- **Frontend:** React, Tailwind CSS, Lucide React, Vite
- **Backend:** Express, http-proxy-middleware, TSX
- **Language:** TypeScript

## Project Structure

- `src/App.tsx`: Main React application entry point containing the UI (Dashboard, Policies, Audit Logs, Search).
- `server.ts`: The Express/Vite backend that proxies traffic, enforces policies, and serves APIs for the frontend.
- `package.json`: Project dependencies and npm scripts (`dev`, `start`, `build`).

## OSS Edition Limitations

This repository hosts the **OSS Edition**. By design, this version operates strictly with **in-memory data**. 
- Limitations such as a maximum of 5 active policies at a time apply.
- State is lost when the server restarts.
- Single-node architecture.

## Future Extensions

Because this project is built keeping minimalism in mind, you can freely extend it for your own production needs:
- **Authentication:** Add your own Auth provider to restrict who can access the dashboard.
- **Persistent Storage:** Replace the in-memory sets and arrays in `server.ts` with your preferred database (PostgreSQL, Redis, Mongo, etc.) to persist policies and logs.
- **Clustering:** Scale the Express app through standard load balancing techniques.

## Why no Firebase/Supabase/Stripe?

Toll Router OSS is designed to be purely un-opinionated about your infrastructure and billing. The goal is to provide the core proxying and traffic monitoring interface, letting the developer hook in their preferred persistence layer later if they decide to graduate from the zero-dependency in-memory mode.
