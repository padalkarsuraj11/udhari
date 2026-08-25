// ============================================================
// UDHARI PLATFORM — Backend API Server
// Node.js + Express + Supabase
//
// Routes:
//   /api/auth/*        — Authentication (login, logout, session)
//   /api/admin/*       — Platform Admin operations (requireAdmin)
//   /api/owner/*       — Authenticated owner's own context
//   /api/contractors/* — Tenant-scoped contractors (stub → Phase 3)
//   /api/customers/*   — Tenant-scoped customers (stub → Phase 3)
//   /api/transactions/*— Tenant-scoped transactions (stub → Phase 3)
//   /api/payments/*    — Tenant-scoped payments (stub → Phase 3)
//   /api/bills/*       — Tenant-scoped bills (stub → Phase 3)
//   /api/risk/*        — Risk profiles (stub → Phase 3)
// ============================================================

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

// Route modules
const authRoutes         = require('./routes/auth');
const adminRoutes        = require('./routes/admin');
const ownerRoutes        = require('./routes/owner');
const contractorsRoutes  = require('./routes/contractors');
const customersRoutes    = require('./routes/customers');
const transactionsRoutes = require('./routes/transactions');
const paymentsRoutes     = require('./routes/payments');
const billsRoutes        = require('./routes/bills');
const riskRoutes         = require('./routes/risk');
const materialsRoutes    = require('./routes/materials');

const app  = express();
const PORT = process.env.PORT || 4000;

// ---- Security ----
app.use(helmet());

// ---- CORS ----
const allowedOrigins = [
  'http://localhost:5173', // Admin (default Vite port)
  'http://localhost:5174', // Client (second Vite instance)
  process.env.ADMIN_ORIGIN,
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// ---- Body Parsing ----
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Logging ----
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ---- Rate Limiting ----
// Global limiter
const globalLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            500,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { error: 'RATE_LIMIT', message: 'Too many requests. Please try again later.' },
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            20,              // max 20 login attempts per window
  standardHeaders: true,
  legacyHeaders:  false,
  message: { error: 'RATE_LIMIT', message: 'Too many authentication attempts. Please try again later.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);

// ---- Health Check ----
app.get('/health', (req, res) => {
  res.json({
    status:      'ok',
    service:     'udhari-backend',
    version:     '2.0.0',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    supabase:    !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
});

// ---- API Routes ----
app.use('/api/auth',         authRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/owner',        ownerRoutes);        // NEW: owner-scoped context routes
app.use('/api/contractors',  contractorsRoutes);  // tenant-scoped (Phase 3 stubs)
app.use('/api/customers',    customersRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/payments',     paymentsRoutes);
app.use('/api/bills',        billsRoutes);
app.use('/api/risk',         riskRoutes);
app.use('/api/materials',    materialsRoutes);

// Note: /api/owners (factory stub) is removed — use /api/admin/owners instead

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({
    error:   'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ---- Global Error Handler ----
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const isDev = process.env.NODE_ENV !== 'production';

  console.error('[Error]', {
    method:  req.method,
    path:    req.path,
    message: err.message,
    stack:   isDev ? err.stack : undefined,
  });

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error:   err.code || 'INTERNAL_ERROR',
    message: isDev ? err.message : 'An unexpected error occurred',
  });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`\n🚀 Udhari Backend running on http://localhost:${PORT}`);
  console.log(`   Health:      http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Supabase:    ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}\n`);
});

module.exports = app;
