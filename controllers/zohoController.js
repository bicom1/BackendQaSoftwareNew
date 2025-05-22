const zohoService = require("../services/zohoService");
const axios = require('axios');
require('dotenv').config();


// const getAppointment = async (req, res) => {

  
//   try {
//     const { bookingId } = req.params;
//     const appointment = await zohoService.getAppointment(bookingId);
//     res.json(appointment);
//   } catch (error) {
//     console.error('Error in getAppointment:', error);
//     res.status(error.response?.status || 500).json({
//       error: error.response?.data || error.message,
//     });
//   }
// };

// const getAllAppointments = async (req, res) => {
//   try {
//     const { from_date, to_date, status, service_id } = req.query;
//     const params = {};
    
//     if (from_date) params.from_date = from_date;
//     if (to_date) params.to_date = to_date;
//     if (status) params.status = status;
//     if (service_id) params.service_id = service_id;

//     const appointments = await zohoService.getAllAppointments(params);
//     res.json(appointments);
//   } catch (error) {
//     console.error('Error in getAllAppointments:', error);
//     res.status(error.response?.status || 500).json({
//       error: error.response?.data || error.message,
//     });
//   }
// };

// module.exports = { getAllAppointments };

// module.exports = {
//   getAppointment,
//   getAllAppointments
// };


const getAppointment = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const response = await axios.get(`https://www.zohoapis.com/bookings/v1/json/getappointment`, {
      params: {
        booking_id: bookingId
      },
      headers: {
        Authorization: `Zoho-oauthtoken ${process.env.ZOHO_AUTH_TOKEN}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Zoho API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch appointment details from Zoho' });
  }
};

module.exports = {
  getAppointment
};