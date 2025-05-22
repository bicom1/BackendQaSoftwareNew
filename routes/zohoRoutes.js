// routes/zohoRoutes.js
const express = require('express');
const { getAppointment, getAllAppointments } = require('../controllers/zohoController');
const router = express.Router();

// Test route
// router.get('/test', (req, res) => {
//   res.status(200).json({ 
//     success: true, 
//     message: 'Zoho test route working' 
//   });
// });


router.get('/appointment/:bookingId', getAppointment);
// router.get('/appointments', getAllAppointments);



module.exports = router;