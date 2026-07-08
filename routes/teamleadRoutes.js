const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  addLeader,
  getAllLeaders,
  getLeaderById,
  updateLeader,
  deleteLeader,
  getMyTeamLeader,
} = require('../controllers/teamleadController');

const router = express.Router();

router.post('/create', addLeader);
router.get('/me', authMiddleware, getMyTeamLeader);
router.get('/', getAllLeaders);
router.get('/:id', getLeaderById);
router.put('/:id', updateLeader);
router.delete('/:id', deleteLeader);

module.exports = router;
