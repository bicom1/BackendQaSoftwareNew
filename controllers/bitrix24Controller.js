
const axios = require('axios');

const callBitrixApi = async (req, res) => {
    const currentBitrixApiBaseUrl = process.env.BITRIX_API_BASE_URL;

    if (!req.body || Object.keys(req.body).length === 0) {
        console.warn("[Controller] req.body is undefined, empty, or not parsed. This shouldn't happen if client sends correct Content-Type and body, and express.json() works.".yellow);
        return res.status(400).json({
            success: false,
            message: 'Request body is missing, empty, or not parsed correctly. Ensure Content-Type: application/json and a non-empty JSON body are sent.'
        });
    }

    const { method, params } = req.body;

    if (!currentBitrixApiBaseUrl) {
        console.error("[Controller] FATAL: BITRIX_API_BASE_URL is not set in .env file.".red);
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
        console.log(`[Controller] Attempting to call Bitrix24 API: ${bitrixApiUrl}`.blue);
        console.log(`[Controller] With params:`, JSON.stringify(params || {}, null, 2).blue);

        const bitrixResponse = await axios.post(bitrixApiUrl, params || {});

        console.log('[Controller] Bitrix24 API Response Status:'.green, bitrixResponse.status);

        if (bitrixResponse.data && bitrixResponse.data.error) {
            console.error('[Controller] Bitrix24 API returned an error:'.red, bitrixResponse.data.error_description || bitrixResponse.data.error);
            return res.status(400).json({
                success: false,
                message: `Bitrix24 API error for method ${method}: ${bitrixResponse.data.error_description || bitrixResponse.data.error}`,
                bitrixError: bitrixResponse.data
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully called Bitrix24 method: ${method}`,
            bitrixResponse: bitrixResponse.data.result !== undefined ? bitrixResponse.data.result : bitrixResponse.data
        });

    } catch (error) {
        console.error('[Controller] Error during Bitrix24 API call:'.red, error.message);
        if (error.response) {
            console.error('Bitrix Error Data:'.red, JSON.stringify(error.response.data, null, 2));
            console.error('Bitrix Error Status:'.red, error.response.status);
            return res.status(error.response.status || 500).json({
                success: false,
                message: `Error calling Bitrix24 method ${method}: ${error.response.data.error_description || (error.response.data && error.response.data.error) || 'Unknown Bitrix24 server error'}`,
                errorDetails: error.response.data
            });
        } else if (error.request) {
            console.error('Bitrix Request Error (no response):'.red, error.request);
            return res.status(502).json({
                success: false,
                message: 'No response received from Bitrix24 API.',
                errorDetails: "The request was made but no response was received from Bitrix24."
            });
        } else {
            console.error('General Request Setup Error:'.red, error.message);
            return res.status(500).json({
                success: false,
                message: 'Error in setting up the request to Bitrix24 API.',
                errorDetails: error.message
            });
        }
    }
};

module.exports = {
    callBitrixApi
};