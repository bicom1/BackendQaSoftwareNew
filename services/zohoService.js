
const axios = require('axios');

const getAuthUrl = () => {
 
  return 'https://accounts.zoho.com/oauth/v2/auth';
};

const getTokens = async (code) => {
 
  return { access_token: 'test', refresh_token: 'test' };
};

const makeApiRequest = async (method, endpoint) => {
  
  return { data: 'test data' };
};

module.exports = {
  getAuthUrl,
  getTokens,
  makeApiRequest
};