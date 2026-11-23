const express = require('express');
const { registerUser, loginUser, toggleSavedBoarding, getSavedBoardings, updateUserProfile } = require('../controllers/authController');
const { protect, requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', registerUser);
router.post('/login', loginUser);

// User profile & preferences update
router.put('/profile', protect, requireAuth, updateUserProfile);

// Persist saved boardings
router.post('/saved', protect, requireAuth, toggleSavedBoarding);
router.get('/saved', protect, requireAuth, getSavedBoardings);

module.exports = router;
