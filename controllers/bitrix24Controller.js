const axios = require('axios');

const callBitrixApi = async (req, res) => {
    const currentBitrixApiBaseUrl = process.env.BITRIX_API_BASE_URL;

    if (!req.body || Object.keys(req.body).length === 0) {
        console.warn("[Controller] req.body is undefined, empty, or not parsed.".yellow);
        return res.status(400).json({
            success: false,
            message: 'Request body is missing, empty, or not parsed correctly.'
        });
    }

    const { method, params } = req.body;

    if (!currentBitrixApiBaseUrl) {
        console.error("[Controller] FATAL: BITRIX_API_BASE_URL is not set.".red);
        return res.status(500).json({
            success: false,
            message: 'Server configuration error: Bitrix24 API base URL is not set.'
        });
    }

    if (!method) {
        return res.status(400).json({
            success: false,
            message: 'Bitrix24 API "method" not specified in request body.'
        });
    }

    const bitrixApiUrl = `${currentBitrixApiBaseUrl.replace(/\/$/, '')}/${method}.json`;

    try {
        console.log(`[Controller] Calling Bitrix24 API: ${bitrixApiUrl}`.blue);
        const bitrixResponse = await axios.post(bitrixApiUrl, params || {});

        if (bitrixResponse.data && bitrixResponse.data.error) {
            console.error('[Controller] Bitrix24 API error:'.red, bitrixResponse.data.error);
            return res.status(400).json({
                success: false,
                message: `Bitrix24 API error: ${bitrixResponse.data.error_description || bitrixResponse.data.error}`,
                bitrixError: bitrixResponse.data
            });
        }

        res.status(200).json({
            success: true,
            data: bitrixResponse.data.result !== undefined ? bitrixResponse.data.result : bitrixResponse.data
        });

    } catch (error) {
        console.error('[Controller] Bitrix24 API call failed:'.red, error.message);
        
        if (error.response) {
            res.status(error.response.status || 500).json({
                success: false,
                message: `Bitrix24 API error: ${error.response.data.error_description || error.response.data.error}`,
                errorDetails: error.response.data
            });
        } else if (error.request) {
            res.status(502).json({
                success: false,
                message: 'No response from Bitrix24 API'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Request setup error',
                errorDetails: error.message
            });
        }
    }
};

const crmleadlist = async (req, res, next) => {
    try {
        const { filter = {}, select = [], order = {} } = req.query;
        const bitrixUrl = `${process.env.BITRIX_API_BASE_URL}/crm.lead.list.json`;
        
        const response = await axios.post(bitrixUrl, {
            auth: process.env.BITRIX_AUTH_TOKEN,
            filter,
            select,
            order
        });

        res.status(200).json({
            success: true,
            data: response.data.result
        });
    } catch (error) {
        next(error);
    }
};

const getAllLeads = async (req, res) => {
    try {
        const BITRIX_API_URL = `${process.env.BITRIX_API_BASE_URL}/crm.lead.list`;
        
        // Call Bitrix24 API
        const response = await axios.post(BITRIX_API_URL, {
            auth: process.env.BITRIX_AUTH_TOKEN,
            // Optional: Add filters/select if needed
            select: ["ID", "TITLE", "STATUS_ID", "NAME", "LAST_NAME"],
            order: { "ID": "ASC" } // Sort by ID
        });

        // Return all leads
        res.status(200).json({
            success: true,
            count: response.data.result.length,
            leads: response.data.result
        });

    } catch (error) {
        console.error("Bitrix24 API Error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch leads",
            error: error.response?.data || error.message
        });
    }
};

const getFilteredLeads = async (req, res) => {
    try {
        const BITRIX_API_URL = `${process.env.BITRIX_API_BASE_URL}/crm.lead.list`;
        
        // Extract filters/params from POST request body
        const { 
            filter = {},  // Default: empty filter (get all)
            select = ["ID", "TITLE", "STATUS_ID"], // Default fields
            order = { "ID": "ASC" } // Default sorting
        } = req.body;

        // Call Bitrix24 API with dynamic filters
        const response = await axios.post(BITRIX_API_URL, {
            auth: process.env.BITRIX_AUTH_TOKEN,
            filter,  // Applied filters
            select,  // Selected fields
            order    // Sorting
        });

        res.status(200).json({
            success: true,
            count: response.data.result.length,
            leads: response.data.result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch leads",
            error: error.response?.data || error.message
        });
    }
};

module.exports = {
    callBitrixApi,
    crmleadlist,
    getAllLeads,
    getFilteredLeads
};