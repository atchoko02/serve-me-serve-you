# Serve Me Serve You

A full-stack web application for small and medium-sized businesses to generate automated product recommendation questionnaires for their customers.

## Project Structure

This project follows a monorepo structure with separate frontend and backend applications:

```
├── frontend/          # React frontend application
├── backend/           # Node.js/Express backend API
├── shared/            # Shared types and utilities (future)
└── docs/              # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install root dependencies:

```bash
npm install
```

2. Install frontend dependencies:

```bash
cd frontend && npm install
```

3. Install backend dependencies:

```bash
cd backend && npm install
```

### Development

Run both frontend and backend concurrently:

```bash
npm run dev
```

Or run them separately:

Frontend (port 3000):

```bash
npm run dev:frontend
```

Backend (port 5000):

```bash
npm run dev:backend
```

### Building

Build both applications:

```bash
npm run build
```

Build individually:

```bash
npm run build:frontend
npm run build:backend
```

## Frontend

The frontend is a React application built with Vite, TypeScript, and Tailwind CSS.

- **Location**: `frontend/`
- **Port**: 3000 (development)
- **Tech Stack**: React, TypeScript, Vite, Tailwind CSS, Radix UI

### Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── business/     # Business-facing components
│   │   ├── customer/     # Customer-facing components
│   │   ├── shared/       # Shared components
│   │   └── ui/           # UI component library
│   ├── pages/            # Page-level components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API client services
│   ├── utils/            # Frontend utilities
│   └── styles/           # Stylesheets
└── tests/                # Frontend tests
```

## Backend

The backend is a Node.js/Express API server.

- **Location**: `backend/`
- **Port**: 5000 (development)
- **Tech Stack**: Node.js, Express, TypeScript

### Backend Structure

```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── models/           # Database models
│   ├── routes/           # Express routes
│   ├── middleware/       # Express middleware
│   ├── utils/            # Backend utilities (CSV parser, decision tree)
│   ├── config/           # Configuration
│   └── types/            # TypeScript types
└── tests/                # Backend tests
```

## Testing

Run frontend E2E tests:

```bash
cd frontend && npm run test:e2e
```

Run backend unit tests:

```bash
cd backend && npm run test:unit
```

## Environment Variables

Backend environment variables (create `backend/.env` from `backend/.env.example`):

- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
