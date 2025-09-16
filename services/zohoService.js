require('dotenv').config();
const axios = require('axios');
const { sleep } = require('../helpers');

/**
 * ZohoService
 * Lightweight client for Zoho APIs with OAuth token refresh, retry logic,
 * and simple helpers for Bookings endpoints. Designed to be reused as a
 * singleton across the app.
 */
class ZohoService {
  constructor() {
    this.initialize();
    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.tokenRefreshCount = 0;
    this.lastTokenRefreshTime = null;
  }

  /** Initialize internal state and compute base URL by datacenter */
  initialize() {
    this.validateEnvironment();
    this.accessToken = null;
    this.tokenRefreshPromise = null;
    this.baseUrl = this.getDatacenterUrl();
  }

  /** Ensure required environment variables are present */
  validateEnvironment() {
    const requiredVars = [
      'ZOHO_CLIENT_ID',
      'ZOHO_CLIENT_SECRET',
      'ZOHO_REDIRECT_URI',
      'ZOHO_REFRESH_TOKEN'
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
    this.redirectUri = process.env.ZOHO_REDIRECT_URI;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  }

  /** Infer datacenter base URL from client id prefix */
  getDatacenterUrl() {
    const prefix = this.clientId.substring(0, 5);
    const datacenters = {
      '1000.': 'https://www.zohoapis.com',
      '2000.': 'https://www.zohoapis.eu',
      '3000.': 'https://www.zohoapis.in'
    };
    return datacenters[prefix] || datacenters['1000.'];
  }

  /**
   * Refresh the OAuth access token (serialized via tokenRefreshPromise)
   * Returns the fresh access token string.
   */
  async refreshAccessToken() {
    // Prevent too frequent refresh attempts
    if (this.lastTokenRefreshTime && 
        Date.now() - this.lastTokenRefreshTime < 5000) {
      await sleep(5000);
    }

    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    try {
      this.tokenRefreshCount++;
      this.tokenRefreshPromise = axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        new URLSearchParams({
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      const response = await this.tokenRefreshPromise;
      this.accessToken = response.data.access_token;
      this.lastTokenRefreshTime = Date.now();
      return this.accessToken;
    } catch (error) {
      const errorInfo = this.parseTokenError(error);
      console.error('Token refresh failed:', errorInfo);
      throw new Error(this.getTokenErrorMessage(errorInfo));
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  /** Extract useful error fields from axios error object */
  parseTokenError(error) {
    return {
      status: error.response?.status,
      error: error.response?.data?.error,
      description: error.response?.data?.error_description,
      message: error.message,
      code: error.code
    };
  }

  /** Human-readable message for common token failures */
  getTokenErrorMessage(errorInfo) {
    if (errorInfo.error === 'invalid_client') {
      return 'Invalid client credentials. Verify ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET.';
    }
    if (errorInfo.error === 'invalid_refresh_token') {
      return 'Refresh token is invalid or expired. Generate a new one from Zoho Developer Console.';
    }
    if (errorInfo.code === 'ECONNABORTED') {
      return 'Connection timeout. Check your network connection.';
    }
    return `Token refresh failed: ${errorInfo.message}`;
  }

  /**
   * Perform an axios request with Authorization header and retries on 401.
   * @param {import('axios').AxiosRequestConfig} config
   * @param {number} attempt
   */
  async makeAuthenticatedRequest(config, attempt = 1) {
    if (attempt > this.maxRetries) {
      throw new Error(`Max retries (${this.maxRetries}) exceeded`);
    }

    if (!this.accessToken || attempt > 1) {
      await this.refreshAccessToken();
    }

    try {
      const response = await axios({
        ...config,
        baseURL: this.baseUrl,
        headers: {
          ...config.headers,
          'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      return response.data;
    } catch (error) {
      console.error(`Request attempt ${attempt} failed:`, {
        url: config.url,
        status: error.response?.status,
        error: error.response?.data?.error,
        message: error.message
      });

      if (error.response?.status === 401 && attempt < this.maxRetries) {
        await sleep(this.retryDelay * attempt);
        return this.makeAuthenticatedRequest(config, attempt + 1);
      }

      throw error;
    }
  }

  /** Quick validation that current credentials can obtain a token */
  async verifyCredentials() {
    try {
      await this.refreshAccessToken();
      return { valid: true, message: 'Credentials are valid' };
    } catch (error) {
      return {
        valid: false,
        message: 'Invalid credentials',
        error: error.message,
        solution: this.getTokenSolution(error.message)
      };
    }
  }

  /**
   * Provide actionable resolution steps for common token errors
   * to surface helpful guidance to API consumers.
   */
  getTokenSolution(errorMessage) {
    if (errorMessage.includes('invalid_client')) {
      return [
        '1. Go to https://api-console.zoho.com',
        '2. Verify your client credentials',
        '3. Update .env file with correct values'
      ].join('\n');
    }
    if (errorMessage.includes('invalid_refresh_token')) {
      return [
        '1. Generate new OAuth tokens:',
        '2. Visit https://accounts.zoho.com/developerconsole',
        '3. Create new Self Client and get new refresh token',
        '4. Update ZOHO_REFRESH_TOKEN in .env'
      ].join('\n');
    }
    return 'Check network connection and Zoho API status page';
  }

  // API methods
  /** Fetch a single appointment by booking id */
  async getAppointment(bookingId) {
    return this.makeAuthenticatedRequest({
      method: 'get',
      url: '/bookings/v1/json/getappointment',
      params: { booking_id: bookingId }
    });
  }

  /** List appointments with optional filters */
  async getAllAppointments(params = {}) {
    return this.makeAuthenticatedRequest({
      method: 'get',
      url: '/bookings/v1/json/getappointments',
      params
    });
  }
}

module.exports = new ZohoService();