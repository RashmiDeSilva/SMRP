const Boarding = require('../models/Boarding');
const Booking = require('../models/Booking');
const User = require('../models/User');
const logActivity = require('../utils/logger');
const mongoose = require('mongoose');

const isOwner = (user) => user?.role?.toLowerCase().includes('owner');
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc  Create a new boarding
// @route POST /api/boardings
const createBoarding = async (req, res) => {
    try {
        if (!isOwner(req.user)) {
            return res.status(403).json({ message: 'Only boarding owners can create listings' });
        }

        const boarding = await Boarding.create({ ...req.body, owner: req.user._id });
        
        await logActivity({
            action: 'CREATE',
            targetModel: 'Boarding',
            targetId: boarding._id,
            details: { boardingName: boarding.boardingName, location: boarding.location },
            req
        });

        res.status(201).json({ boarding });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc  Get all boardings
// @route GET /api/boardings
const getBoardings = async (req, res) => {
    try {
        let filter = {};
        if (req.query.owner) {
            if (!req.user) {
                return res.status(401).json({ message: 'Authentication required to view owner listings' });
            }
            if (!isOwner(req.user)) {
                return res.status(403).json({ message: 'Only boarding owners can view owner listings' });
            }
            const requestedOwner = String(req.query.owner);
            const ownerMatches = requestedOwner.toLowerCase() === req.user.email.toLowerCase()
                || (mongoose.Types.ObjectId.isValid(requestedOwner) && requestedOwner === req.user._id.toString());
            if (!ownerMatches) {
                return res.status(403).json({ message: 'You can only view your own boarding listings' });
            }
            filter.owner = req.user._id;
        } else {
            // Only show boardings that have a valid owner
            filter.owner = { $ne: null };
        }

        // Add search filtering if query exists
        if (req.query.search) {
            const searchRegex = { $regex: escapeRegex(req.query.search), $options: 'i' };
            filter.$or = [
                { boardingName: searchRegex },
                { location: searchRegex },
                { description: searchRegex },
                { boardingType: searchRegex }
            ];
        }

        // Sort by createdAt descending so newly added boardings appear at the top
        const boardings = await Boarding.find(filter)
            .sort({ createdAt: -1 })
            .populate('owner', 'name email phone');

        await logActivity({
            action: 'READ',
            targetModel: 'Boarding',
            details: { count: boardings.length, query: req.query },
            req
        });

        res.json({ boardings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc  Delete a boarding
// @route DELETE /api/boardings/:id
const deleteBoarding = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid boarding ID' });
        }
        const boarding = await Boarding.findById(req.params.id);

        if (!boarding) {
            return res.status(404).json({ message: 'Boarding not found' });
        }

        if (!isOwner(req.user)) {
            return res.status(403).json({ message: 'Only boarding owners can delete listings' });
        }
        if (!boarding.owner || boarding.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own boarding places' });
        }
        if (await Booking.exists({ boarding: boarding._id })) {
            return res.status(409).json({ message: 'This listing has reservation history and cannot be deleted. Edit it to mark it unavailable instead.' });
        }

        await boarding.deleteOne();

        await logActivity({
            action: 'DELETE',
            targetModel: 'Boarding',
            targetId: boarding._id,
            details: { name: boarding.boardingName, address: boarding.address },
            req
        });

        res.json({ message: 'Boarding removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc  Update a boarding
// @route PUT /api/boardings/:id
const updateBoarding = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid boarding ID' });
        }
        const boarding = await Boarding.findById(req.params.id);

        if (!boarding) {
            return res.status(404).json({ message: 'Boarding not found' });
        }

        if (!isOwner(req.user)) {
            return res.status(403).json({ message: 'Only boarding owners can update listings' });
        }
        if (!boarding.owner || boarding.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only update your own boarding places' });
        }
        req.body.owner = req.user._id;

        const updatedBoarding = await Boarding.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        await logActivity({
            action: 'UPDATE',
            targetModel: 'Boarding',
            targetId: updatedBoarding._id,
            details: { boardingName: updatedBoarding.boardingName, updatedFields: Object.keys(req.body) },
            req
        });

        res.json({ boarding: updatedBoarding });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc  Get boarding place by name
// @route GET /api/boardings/name/:name
const getBoardingByName = async (req, res) => {
    try {
        const { name } = req.params;
        if (!name) {
            return res.status(400).json({ message: 'Boarding name is required' });
        }
        
        // Use a case-insensitive regex match to be more flexible, or exact match depending on needs
        const boardings = await Boarding.find({
            boardingName: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') }
        }).populate('owner', 'name email phone');

        await logActivity({
            action: 'READ',
            targetModel: 'Boarding',
            details: { count: boardings.length, query: { name } },
            req
        });

        res.json({ boardings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createBoarding, getBoardings, deleteBoarding, updateBoarding, getBoardingByName };
