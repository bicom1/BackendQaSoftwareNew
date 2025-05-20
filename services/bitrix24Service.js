const axios = require('axios');
require('dotenv').config();

class Bitrix24Service {
  constructor(accessToken = null) {
    this.accessToken = accessToken;
    this.baseUrl = `https://${process.env.BITRIX24_DOMAIN}/rest/`;
  }

  // Generic API request method
  async _callApi(method, params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${method}`, {
        params: {
          ...params,
          ...(this.accessToken && { auth: this.accessToken }) // Add auth if token exists
        }
      });
      return response.data;
    } catch (error) {
      console.error('Bitrix24 API Error:', error.response?.data);
      throw new Error(error.response?.data?.error_description || 'API request failed');
    }
  }

  
  async getTokens(code) {
    const response = await axios.post(
      `https://${process.env.BITRIX24_DOMAIN}/oauth/token/`,
      {
        grant_type: 'authorization_code',
        client_id: process.env.BITRIX24_CLIENT_ID,
        client_secret: process.env.BITRIX24_CLIENT_SECRET,
        redirect_uri: process.env.BITRIX24_REDIRECT_URI,
        code: code
      }
    );
    return response.data; 
  }

  async getCurrentUser() {
    return this._callApi('user.current');
  }

  async createLead(leadData) {
    return this._callApi('crm.lead.add', {
      fields: {
        ...leadData,
        STATUS_ID: 'NEW' 
      }
    });
  }
}

// async addBookingResource(resourceData) {
//     return this._callApi('booking.v1.resource.add', {
//       fields: {
//         ...resourceData,
        
//         isMain: resourceData.isMain || "N",
//         isInfoNotificationOn: resourceData.isInfoNotificationOn || "Y",
//         templateTypeInfo: resourceData.templateTypeInfo || "inanimate"
//       }
//     });
//   }

module.exports = Bitrix24Service;