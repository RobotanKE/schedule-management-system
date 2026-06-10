const express = require('express');
const router = express.Router();

/**
 * GET home page
 * Renders the main index view
 */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Schedule Management System' });
});

module.exports = router;