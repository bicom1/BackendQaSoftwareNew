const express = require('express');
const router = express.Router();
const { callBitrixApi } = require('../controllers/bitrix24Controller');




router.post('/call-b24-api',callBitrixApi);

router.get('/test', (req, res) => {
    res.send('Bitrix24 route is working!');
  });

module.exports = router;