const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Boarding = require('../models/Boarding');
const logActivity = require('../utils/logger');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Map database roles to frontend expected strings
const getDisplayRole = (dbRole) => {
  if (dbRole === 'owner') return 'Boarding Owner';
  if (dbRole === 'student') return 'Student';
  if (dbRole === 'intern') return 'Intern';
  if (dbRole === 'employee') return 'Employee';
  return dbRole;
};

const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  fullName: user.name,
  email: user.email,
  role: getDisplayRole(user.role),
  phone: user.phone || '',
  city: user.city || '',
  bio: user.bio || '',
  profilePicture: user.profilePicture || '',
  notificationPreferences: user.notificationPreferences || {},
  savedBoardingIds: (user.savedBoardings || []).map((id) => id.toString()),
});

// @desc  Register a new user
// @route POST /api/auth/signup
const registerUser = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const role = typeof req.body.role === 'string' ? req.body.role : '';
  const name = String(req.body.name || req.body.fullName || '').trim();

  // Normalize role for database persistence
  let normalizedRole = 'student';
  if (role) {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('owner')) {
      normalizedRole = 'owner';
    } else if (roleLower.includes('student')) {
      normalizedRole = 'student';
    } else if (roleLower.includes('intern')) {
      normalizedRole = 'intern';
    } else if (roleLower.includes('employee')) {
      normalizedRole = 'employee';
    } else if (roleLower.includes('admin')) {
      return res.status(403).json({ message: 'Administrator accounts cannot be created through sign up' });
    }
  }

  try {
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      return res.status(400).json({ message: 'Name, a valid email, and a password of at least 6 characters are required' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: normalizedRole,
      phone: req.body.phone || '',
      city: req.body.city || '',
    });

    if (user) {
      await logActivity({
        action: 'CREATE',
        targetModel: 'User',
        targetId: user._id,
        details: { name: user.name, email: user.email, role: user.role },
        user: user,
      });

      res.status(201).json({
        user: toPublicUser(user),
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Login user
// @route POST /api/auth/login
const loginUser = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      await logActivity({
        action: 'READ',
        targetModel: 'User',
        targetId: user._id,
        details: { email: user.email, actionType: 'login' },
        user: user,
      });

      res.json({
        user: toPublicUser(user),
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Toggle a boarding place in saved list
// @route POST /api/auth/saved
const toggleSavedBoarding = async (req, res) => {
  try {
    const { boardingId } = req.body;
    console.log(`[toggleSaved] boardingId=${boardingId} req.user=${req.user?.email}`);

    if (!mongoose.Types.ObjectId.isValid(boardingId)) {
      return res.status(400).json({ message: 'A valid boarding place is required' });
    }
    if (!(await Boarding.exists({ _id: boardingId, owner: { $ne: null } }))) {
      return res.status(404).json({ message: 'Boarding place not found' });
    }

    const user = req.user;
    if (!user) {
      console.log('[toggleSaved] No user found — returning 400');
      return res.status(400).json({ message: 'Valid user credentials required' });
    }

    // Check if already saved using string comparison
    const alreadySaved = user.savedBoardings.some(
      (id) => id.toString() === boardingId.toString()
    );
    console.log(`[toggleSaved] alreadySaved=${alreadySaved} currentSaved=[${user.savedBoardings.map(i=>i.toString()).join(',')}]`);

    // Use atomic update — bypasses Mongoose enum validation entirely
    const updated = await User.findByIdAndUpdate(
      user._id,
      alreadySaved
        ? { $pull: { savedBoardings: boardingId } }
        : { $addToSet: { savedBoardings: boardingId } },
      { new: true }
    );
    console.log(`[toggleSaved] after update savedBoardings=[${updated.savedBoardings.map(i=>i.toString()).join(',')}]`);

    await logActivity({
      action: 'UPDATE',
      targetModel: 'User',
      targetId: user._id,
      details: { action: alreadySaved ? 'unsave' : 'save', boardingId },
      req,
    });

    // Return plain strings so frontend .includes() works
    res.json({
      savedBoardingIds: updated.savedBoardings.map((id) => id.toString()),
    });
  } catch (error) {
    console.error('toggleSavedBoarding error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get saved boarding places for a user
// @route GET /api/auth/saved
const getSavedBoardings = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(400).json({ message: 'Valid user credentials required' });
    }

    res.json({
      savedBoardingIds: (user.savedBoardings || []).map((id) => id.toString()),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update user profile & preferences
// @route PUT /api/auth/profile
const updateUserProfile = async (req, res) => {
  try {
    // `protect` deliberately omits password; load it only for this password-verification path.
    const user = await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, fullName, phone, city, bio, password, currentPassword, notificationPreferences, profilePicture } = req.body;
    if (name || fullName) user.name = fullName || name;
    if (phone !== undefined) user.phone = phone;
    if (city !== undefined) user.city = city;
    if (bio !== undefined) user.bio = bio;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (notificationPreferences !== undefined) user.notificationPreferences = notificationPreferences;
    if (password) {
      if (!currentPassword || !(await user.matchPassword(currentPassword))) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
      }
      user.password = password; // pre-save hook handles hashing
    }

    await user.save();

    await logActivity({
      action: 'UPDATE',
      targetModel: 'User',
      targetId: user._id,
      details: { updatedFields: Object.keys(req.body) },
      req,
    });

    res.json({
      success: true,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('updateUserProfile error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { registerUser, loginUser, toggleSavedBoarding, getSavedBoardings, updateUserProfile };
