const express = require('express');
const { getLowRatingCalls, getLowRatingChats } = require('../controllers/agentController');
const router = express.Router();


router.get("/low-rating", getLowRatingCalls);
router.get("/low-rating-chats", getLowRatingChats);




// router.post('/call-b24-api',callBitrixApi);
// router.get('/crmleadlist', crmleadlist)
// router.get('/leads', getAllLeads);
// router.post('/getFilteredLeads', getFilteredLeads)




module.exports = router;












