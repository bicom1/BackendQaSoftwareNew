const express = require('express');
const {
  addLeader,
  getAllLeaders,
  getLeaderById,
  updateLeader,
  deleteLeader
} = require('../controllers/teamleadController');

const router = express.Router();

router.post('/create', addLeader);
router.get('/', getAllLeaders);
router.get('/:id', getLeaderById);
router.put('/:id', updateLeader);
router.delete('/:id', deleteLeader);

module.exports = router;
