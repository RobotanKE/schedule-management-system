const { pool } = require('./db'); // FIXED: correct import
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './psql.env' });

// JWT secret from environment (required)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in .env file');
}

/**
 * Middleware: Verify JWT token from Authorization header
 * Expected header format: "Bearer <token>"
 */
function authenticateToken(req, res, next) {
  console.log('[Auth] Verifying token...');

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.log('[Auth] No Authorization header');
    return res.status(401).json({ message: 'Token missing' });
  }

  const token = authHeader.split(' ')[1]; // Extract token after "Bearer"
  if (!token) {
    console.log('[Auth] Invalid token format');
    return res.status(401).json({ message: 'Invalid token format' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('[Auth] Token verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    console.log('[Auth] Token verified for user:', user.username);
    req.user = user; // Attach user data to request
    next();
  });
}

/**
 * Middleware: Check if user has required role
 * @param {string} role - Required role ('editor' or 'viewer')
 */
function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user context' });
    }
    if (req.user.role !== role) {
      console.log(`[Auth] Access denied: user=${req.user.username}, required=${role}, actual=${req.user.role}`);
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Utility: Add a new client (used for initial data seeding)
 */
const addClient = async (name, surname, lastName, birthday) => {
  try {
    const result = await pool.query(
        `INSERT INTO clients (name, surname, lastName, birthday) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, surname, lastName, birthday]
    );
    console.log('Client added:', result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error('Error adding client:', err);
    throw err;
  }
};

/**
 * Utility: Add a new specialist (used for initial data seeding)
 */
const addSpecialist = async (name, surname, lastName, department, post) => {
  try {
    const result = await pool.query(
        `INSERT INTO specialists (name, surname, lastName, department, post) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, surname, lastName, department, post]
    );
    console.log('Specialist added:', result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error('Error adding specialist:', err);
    throw err;
  }
};

module.exports = {
  addSpecialist,
  addClient,
  authenticateToken,
  authorizeRole
};