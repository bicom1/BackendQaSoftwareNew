
// const axios = require('axios');
// require('dotenv').config();


// const BITRIX_API_BASE_URL = process.env.BITRIX_API_BASE_URL;

// const callBitrixApi = async (method, data = {}) => {
//   const url = `${BITRIX_API_BASE_URL}${method}`;
//   try {
//     const response = Object.keys(data).length
//       ? await axios.post(url, data)
//       : await axios.get(url);

//     return response.data;
//   } catch (error) {
//     console.error(`Bitrix API Error (${method}):`, error.message);
//     throw new Error('Failed to fetch data from Bitrix24');
//   }
// };

// module.exports = { callBitrixApi };

// // Create a new file bitrixService.js
// // Create a new file bitrixService.js
// const syncEscalationWithBitrix = async (escalationId) => {
//   try {
//     const escalation = await Escalation.findById(escalationId);
    
//     if (!escalation || !escalation.leadID) return;
    
    
//     const bitrixData = {
    
//       COMMENTS: `Escalation created: ${escalation.escSeverity} - ${escalation.issueIden}`
//     };
    
//     // Make API call to update Bitrix lead
//     const response = await fetch(
//       `https://yourdomain.bitrix24.com/rest/1/your_token/crm.lead.update?id=${escalation.leadID}`,
//       {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ fields: bitrixData })
//       }
//     );
    
//     const result = await response.json();
//     console.log("Bitrix lead updated:", result);
//   } catch (error) {
//     console.error("Error syncing with Bitrix:", error);
//   }
// };

// module.exports = { syncEscalationWithBitrix };
// import Escalation from "../models/Escalation";

// const syncEscalationWithBitrix = async (escalationId) => {
//   try {
//     const escalation = await Escalation.findById(escalationId);
    
//     if (!escalation || !escalation.leadID) return;
    
//     const bitrixData = {
//       COMMENTS: `Escalation created: ${escalation.escSeverity} - ${escalation.issueIden}`
//     };
    
//     const response = await fetch(
//       `https://yourdomain.bitrix24.com/rest/1/your_token/crm.lead.update?id=${escalation.leadID}`,
//       {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ fields: bitrixData })
//       }
//     );
    
//     const result = await response.json();
//     console.log("Bitrix lead updated:", result);
//   } catch (error) {
//     console.error("Error syncing with Bitrix:", error);
//   }
// };

// export { syncEscalationWithBitrix };
