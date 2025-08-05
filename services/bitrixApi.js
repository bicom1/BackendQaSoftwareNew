const axios = require('axios');
require('dotenv').config();

const BITRIX_API_BASE_URL = process.env.BITRIX_API_BASE_URL;

/**
 * @param {string} method - e.g. 'crm.lead.list', 'crm.lead.get'
 * @param {object} [data={}]
 * @returns {Promise<object>}
 */
const callBitrixApi = async (method, data = {}) => {
  const url = `${BITRIX_API_BASE_URL}${method}`;
  try {
    // Use POST for list-type queries, GET for single item fetch
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
