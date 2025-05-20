const zohoService = require('../services/zohoService');

// Initiate Zoho OAuth flow
const initiateAuth = (req, res) => {
  res.redirect(zohoService.getAuthUrl());
};

// // Handle Zoho callback
// const handleCallback = async (req, res) => {
//   try {
//     const { code } = req.query;
//     if (!code) {
//       return res.status(400).json({ success: false, message: 'Authorization code missing' });
//     }

//     const tokens = await zohoService.getTokens(code);
//     // Store refresh token securely (in DB or .env)
//     res.status(200).json({ 
//       success: true, 
//       message: 'Zoho connected successfully', 
//       refresh_token: tokens.refresh_token 
//     });
//   } catch (error) {
//     console.error('Zoho callback error:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Error during Zoho authentication',
//       error: error.message 
//     });
//   }
// };

// Get Zoho CRM contacts
const getContacts = async (req, res) => {
  try {
    const contacts = await zohoService.makeApiRequest(
      'GET', 
      '/crm/v2/contacts'
    );
    res.status(200).json({ 
      success: true, 
      data: contacts 
    });
  } catch (error) {
    console.error('Zoho contacts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contacts',
      error: error.message 
    });
  }
};

module.exports = {
  initiateAuth,
  handleCallback,
  getContacts
};