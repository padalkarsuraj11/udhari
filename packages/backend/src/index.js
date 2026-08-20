// ============================================================
// UDHARI PLATFORM — Backend API Server
// Node.js + Express + Supabase
// ============================================================

require('dotenv').config();
const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const morgan         = require('morgan');
const rateLimit      = require('express-rate-limit');

// Route modules
const authRoutes         = require('./routes/auth');
const adminRoutes        = require('./routes/admin');
const ownersRoutes       = require('./routes/owners');
const contractorsRoutes  = require('./routes/contractors');
const customersRoutes    = require('./routes/customers');
const transactionsRoutes = require('./routes/transactions');
const paymentsRoutes     = require('./routes/payments');
const billsRoutes        = require('./routes/bills');
const riskRoutes         = require('./routes/risk');

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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ---- Health Check ----
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'udhari-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ---- API Routes ----
app.use('/api/auth',         authRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/owners',       ownersRoutes);
app.use('/api/contractors',  contractorsRoutes);
app.use('/api/customers',    customersRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/payments',     paymentsRoutes);
app.use('/api/bills',        billsRoutes);
app.use('/api/risk',         riskRoutes);

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ---- Error Handler ----
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`\n🚀 Udhari Backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
