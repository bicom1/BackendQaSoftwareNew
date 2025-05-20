// routes/zohoRoutes.js
const express = require('express');
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Zoho test route working' 
  });
});

module.exports = router;