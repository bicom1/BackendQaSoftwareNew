
const axios = require('axios');
require('dotenv').config();

const BITRIX_API_BASE_URL = process.env.BITRIX_API_BASE_URL;

const callBitrixApi = async (method, data = {}) => {
  const url = `${BITRIX_API_BASE_URL}${method}`;
  try {
    const response = Object.keys(data).length
      ? await axios.post(url, data)
      : await axios.get(url);

    return response.data;
  } catch (error) {
    console.error(`Bitrix API Error (${method}):`, error.message);
    throw new Error('Failed to fetch data from Bitrix24');
  }
};

module.exports = { callBitrixApi };
