const express = require('express');
const { createBoarding, getBoardings, deleteBoarding, updateBoarding, getBoardingByName } = require('../controllers/boardingController');
const { protect, requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', requireAuth, createBoarding);
router.get('/', getBoardings);
router.get('/name/:name', getBoardingByName);
router.delete('/:id', requireAuth, deleteBoarding);
router.put('/:id', requireAuth, updateBoarding);

module.exports = router;
