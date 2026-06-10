const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const indexRouter = require('./routes/index');
const { pool, updateDatabase } = require("./routes/db");
const { router } = require("./routes/functionOfDataBase");

const app = express();

// Normalize port from env or default to 5000
const normalizePort = (val) => {
  const port = parseInt(val, 10);
  return isNaN(port) ? val : (port >= 0 ? port : false);
};

const PORT = normalizePort(process.env.PORT || '5000');
app.set('port', PORT);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true,
}));

// Request logging middleware (dev only)
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Main routes
app.use('/', indexRouter);

// API routes - all go through the same router
// (assuming router handles routing internally based on req.path)
app.post('/clients', router);
app.post('/specialists', router);
app.post('/timeWeek', router);
app.post('/register', router);
app.post('/login', router);
app.post('/timeWeek/schedule', router);
app.post('/timeWeek/social-schedule', router);

app.delete('/specialists/:id', router);
app.delete('/clients/:id', router);
app.delete('/dropTime/', router);
app.delete('/timeWeek/social-schedule/', router);

app.put('/clients/:id', router);
app.put('/specialists/:id', router);
app.put('/timeWeek/:client_id/:spec_id', router);
app.put('/social-scheduler/:id', router);
app.put('/:id', router);

app.use('/timeWeek', router);

app.get('/timeWeek/spec/', router);
app.get('/timeWeek/specialist/:specId', router);
app.get('/timeWeek/cl/', router);
app.get('/timeWeek/client_one/', router);
app.get('/timeWeek/social-schedule/', router);
app.get('/specialists', router);
app.get('/client/', router);
app.get('/clients', router);
app.get('/clients/specialist/', router);


app.get('/schedule/', (req, res) => res.status(501).json({ error: 'Not implemented' }));
app.get('/timeWeek/search', (req, res) => res.status(501).json({ error: 'Not implemented' }));
app.get('/timeWeek/social-schedule/', (req, res) => res.status(501).json({ error: 'Not implemented' }));

// 404 handler
app.use((req, res, next) => {
  next(createError(404));
});

// Database initialization
const startApp = async () => {
  if (process.env.DB_MODE === 'reset') {
    // WARNING: This resets the database!
    await resetDB();
  } else {
    // Test database connection
    try {
      const res = await pool.query('SELECT NOW()');
      console.log('Database connected:', res.rows[0]);
    } catch (err) {
      console.error('Database connection error:', err.stack);
    }
  }
};

startApp();

module.exports = app;