const AsyncHandler = require('express-async-handler');
const Bitrix24Service = require('../services/bitrix24Service');
const User = require('../model/usermodel');

const getAuthUrl = AsyncHandler(async (req, res) => {
  const authUrl = `https://${process.env.BITRIX24_DOMAIN}/oauth/authorize/?client_id=${process.env.BITRIX24_CLIENT_ID}&redirect_uri=${process.env.BITRIX24_REDIRECT_URI}&response_type=code`;
  res.json({ authUrl });
});


const handleCallback = AsyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.status(400);
    throw new Error('Authorization code missing');
  }

  try {
    const bitrix = new Bitrix24Service();
    const tokens = await bitrix.getTokens(code);


    await User.findByIdAndUpdate(req.user._id, {
      bitrix24: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        domain: process.env.BITRIX24_DOMAIN
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Bitrix24 auth error:', error);
    res.status(500).json({ error: error.message });
  }
});


const createLead = AsyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user.bitrix24?.accessToken) {
    res.status(401);
    throw new Error('Bitrix24 not connected');
  }

  const bitrix = new Bitrix24Service(user.bitrix24.accessToken);
  const result = await bitrix.createLead(req.body);  
  
  res.json(result);
});


const getBitrixUser = AsyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user.bitrix24?.accessToken) {
    res.status(401);
    throw new Error('Bitrix24 not connected');
  }

  const bitrix = new Bitrix24Service(user.bitrix24.accessToken);
  const bitrixUser = await bitrix.getCurrentUser();
  
  res.json(bitrixUser);
});

module.exports = {
  getAuthUrl,
  handleCallback,
  createLead,
  getBitrixUser
};