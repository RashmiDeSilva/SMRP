const Booking = require('../models/Booking');
const Boarding = require('../models/Boarding');
const mongoose = require('mongoose');
const logActivity = require('../utils/logger');

const isBoardingOwner = (user) => user?.role?.toLowerCase().includes('owner');
const isBookingClient = (user) => ['student', 'intern', 'employee'].includes(user?.role?.toLowerCase());
const bookingBelongsToClient = (booking, user) => booking?.student?.toString() === user?._id?.toString();
const bookingBelongsToOwner = (booking, user) => booking?.owner?.toString() === user?._id?.toString();

// @desc  Create a booking request
// @route POST /api/bookings
const createBooking = async (req, res) => {
    try {
        const { boardingId, message, numberOfRooms, numberOfBeds, roomType, specialNote, studentPhone } = req.body;
        const student = req.user;
        if (!isBookingClient(student)) {
            return res.status(403).json({ message: 'Only students, interns, and employees can create bookings' });
        }
        if (!mongoose.Types.ObjectId.isValid(boardingId)) {
            return res.status(400).json({ message: 'A valid boarding place is required' });
        }

        const boarding = await Boarding.findById(boardingId);
        if (!boarding) {
            console.log(`[createBooking] Boarding not found: ${boardingId}`);
            return res.status(404).json({ message: 'Boarding place not found' });
        }

        if (!boarding.owner) {
            return res.status(409).json({ message: 'This listing is not linked to an owner and cannot accept bookings yet' });
        }

        const parsedRooms = Math.max(1, parseInt(numberOfRooms, 10) || 1);
        const parsedBeds = Math.max(1, parseInt(numberOfBeds, 10) || 1);

        const booking = await Booking.create({
            student: student._id,
            boarding: boardingId,
            owner: boarding.owner,
            message: message || `Booking for ${parsedRooms} room(s), ${parsedBeds} bed(s)`,
            status: 'pending',
            numberOfRooms: parsedRooms,
            numberOfBeds: parsedBeds,
            roomType: roomType || 'Same Room (Shared Beds)',
            specialNote: specialNote || '',
            boardingName: boarding.boardingName,
            studentName: student.name,
            studentEmail: student.email,
            studentPhone: studentPhone || student.phone || '',
        });

        console.log(`[createBooking] Booking created: ID=${booking._id} Beds=${booking.numberOfBeds} Rooms=${booking.numberOfRooms} Owner=${booking.owner}`);

        await logActivity({
            action: 'CREATE',
            targetModel: 'Booking',
            targetId: booking._id,
            details: { message, boardingName: boarding.boardingName, numberOfRooms: parsedRooms, numberOfBeds: parsedBeds, roomType },
            req,
        });

        res.status(201).json({ booking });
    } catch (error) {
        console.error('[createBooking] Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc  Get bookings for student or owner
// @route GET /api/bookings
const getBookings = async (req, res) => {
    try {
        let filter = {};

        const user = req.user;

        // Case-insensitive owner role check
        const isOwner = isBoardingOwner(user);

        if (isOwner) {
            const ownerBoardings = await Boarding.find({
                owner: user._id
            }).select('_id');
            const ownerBoardingIds = ownerBoardings.map(b => b._id);

            // Include legacy bookings linked either to the owner or one of the owner's listings.
            filter = {
                $or: [
                    { owner: user._id },
                    { boarding: { $in: ownerBoardingIds } }
                ]
            };
        } else {
            // Student / Intern / Employee sees only their own booking requests
            filter.student = user._id;
        }

        const bookings = await Booking.find(filter)
            .populate('boarding')
            .populate('student', 'name email phone profilePicture')
            .populate('owner', 'name email phone')
            .sort({ createdAt: -1 });

        console.log(`[getBookings] user=${user.email} role=${user.role} isOwner=${isOwner} count=${bookings.length}`);

        await logActivity({
            action: 'READ',
            targetModel: 'Booking',
            details: { count: bookings.length },
            req,
        });

        res.json({ bookings });
    } catch (error) {
        console.error('[getBookings] Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc  Confirm or reject a booking request
// @route PUT /api/bookings/:id/status
const updateBookingStatus = async (req, res) => {
    let reservedCapacity = null;
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid booking ID' });
        }
        const { status, ownerBankDetails } = req.body;
        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const allowedStatuses = ['pending', 'confirmed', 'rejected', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid booking status' });
        }

        if (status === 'cancelled') {
            if (!isBookingClient(req.user) || !bookingBelongsToClient(booking, req.user)) {
                return res.status(403).json({ message: 'Only the client who made this booking can cancel it' });
            }
            if (booking.status === 'cancelled') {
                return res.json({ booking });
            }
            if (!['pending', 'confirmed'].includes(booking.status)) {
                return res.status(400).json({ message: 'Only pending or confirmed bookings can be cancelled' });
            }
        } else {
            if (!isBoardingOwner(req.user) || !bookingBelongsToOwner(booking, req.user)) {
                return res.status(403).json({ message: 'Only this listing’s owner can update its booking status' });
            }
            if (!['confirmed', 'rejected'].includes(status)) {
                return res.status(400).json({ message: 'Owners can confirm or reject bookings' });
            }
            const ownerTransitionAllowed = status === 'confirmed'
                ? ['pending', 'rejected'].includes(booking.status)
                : ['pending', 'confirmed'].includes(booking.status);
            if (!ownerTransitionAllowed) {
                return res.status(409).json({ message: 'This reservation can no longer be updated from its current status' });
            }
        }

        const previousStatus = booking.status;
        let boardingForCapacityCheck = null;
        let bedsPerRoom = 2;
        if (status === 'confirmed' && previousStatus !== 'confirmed') {
            boardingForCapacityCheck = await Boarding.findById(booking.boarding);
            if (!boardingForCapacityCheck) {
                return res.status(409).json({ message: 'The boarding listing is no longer available' });
            }
            const requestedBeds = Math.max(1, booking.numberOfBeds || 1);
            if (boardingForCapacityCheck.bedsPerRoom && typeof boardingForCapacityCheck.bedsPerRoom === 'string') {
                const match = boardingForCapacityCheck.bedsPerRoom.match(/\d+/);
                if (match) bedsPerRoom = Math.max(1, parseInt(match[0], 10) || 1);
            } else if (boardingForCapacityCheck.totalBeds && boardingForCapacityCheck.totalRooms > 0) {
                bedsPerRoom = Math.max(1, Math.round(boardingForCapacityCheck.totalBeds / boardingForCapacityCheck.totalRooms));
            }
            const reservation = await Boarding.updateOne(
                { _id: boardingForCapacityCheck._id, availableBeds: { $gte: requestedBeds } },
                { $inc: { availableBeds: -requestedBeds } }
            );
            if (!reservation.modifiedCount) {
                return res.status(409).json({ message: 'There are not enough available beds to confirm this reservation' });
            }
            reservedCapacity = { boardingId: boardingForCapacityCheck._id, beds: requestedBeds };
        }

        const statusUpdate = { status };
        if (req.body.cancellationReason) {
            statusUpdate.cancellationReason = String(req.body.cancellationReason).slice(0, 500);
        }
        if (status === 'cancelled') {
            const clientName = (req.user && (req.user.fullName || req.user.name)) || booking.studentName || 'Client';
            statusUpdate.ownerCancelMessage = `${clientName} cancelled this reservation. It is listed under Rejected bookings.`;
        }
        if (ownerBankDetails && status === 'confirmed') {
            statusUpdate.ownerBankDetails = {
                bankName: ownerBankDetails.bankName || '',
                accountNumber: ownerBankDetails.accountNumber || '',
                branchName: ownerBankDetails.branchName || '',
                accountHolderName: ownerBankDetails.accountHolderName || '',
            };
        }
        const updatedBooking = await Booking.findOneAndUpdate(
            { _id: booking._id, status: previousStatus },
            { $set: statusUpdate },
            { new: true, runValidators: true }
        );
        if (!updatedBooking) {
            if (reservedCapacity) {
                await Boarding.updateOne({ _id: reservedCapacity.boardingId }, { $inc: { availableBeds: reservedCapacity.beds } });
                reservedCapacity = null;
            }
            return res.status(409).json({ message: 'This reservation changed. Refresh the page and try again.' });
        }
        booking = updatedBooking;
        reservedCapacity = null;

        // Automatically update availableBeds and availableRooms on the boarding place when booking status is updated
        if (booking.boarding) {
            const boarding = boardingForCapacityCheck || await Boarding.findById(booking.boarding);
            if (boarding) {
                const totalRooms = boarding.totalRooms || 10;
                const updateAvailableRooms = () => Boarding.updateOne({ _id: boarding._id }, [
                    { $set: { availableRooms: { $min: [totalRooms, { $max: [0, { $ceil: { $divide: [{ $ifNull: ['$availableBeds', 0] }, bedsPerRoom] } }] }] } } },
                ]);

                if (status === 'confirmed' && previousStatus !== 'confirmed') {
                    await updateAvailableRooms();
                } else if ((status === 'rejected' || status === 'cancelled') && previousStatus === 'confirmed') {
                    const bedsChange = Math.max(1, booking.numberOfBeds || 1);
                    const maxBeds = boarding.totalBeds || 100;
                    await Boarding.updateOne({ _id: boarding._id }, [
                        { $set: { availableBeds: { $min: [maxBeds, { $add: [{ $ifNull: ['$availableBeds', 0] }, bedsChange] }] } } },
                        { $set: { availableRooms: { $min: [totalRooms, { $max: [0, { $ceil: { $divide: [{ $ifNull: ['$availableBeds', 0] }, bedsPerRoom] } }] }] } } },
                    ]);
                }
            }
        }

        console.log(`[updateBookingStatus] booking=${booking._id} status=${status}`);

        await logActivity({
            action: 'UPDATE',
            targetModel: 'Booking',
            targetId: booking._id,
            details: { status },
            req,
        });

        res.json({ booking });
    } catch (error) {
        if (reservedCapacity) {
            await Boarding.updateOne({ _id: reservedCapacity.boardingId }, { $inc: { availableBeds: reservedCapacity.beds } }).catch(() => {});
        }
        console.error('[updateBookingStatus] Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc  Update booking details by student (resend request)
// @route PUT /api/bookings/:id
const updateBooking = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid booking ID' });
        }
        const { specialNote, studentPhone, message, numberOfRooms, numberOfBeds, roomType } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        if (!isBookingClient(req.user) || !bookingBelongsToClient(booking, req.user)) {
            return res.status(403).json({ message: 'Only the client who made this booking can edit it' });
        }
        if (!['pending', 'rejected'].includes(booking.status)) {
            return res.status(409).json({ message: 'Only pending or rejected bookings can be edited and resent' });
        }

        if (specialNote !== undefined) booking.specialNote = specialNote;
        if (studentPhone !== undefined) booking.studentPhone = studentPhone;
        booking.studentName = req.user.name || booking.studentName;
        booking.studentEmail = req.user.email || booking.studentEmail;
        if (numberOfRooms !== undefined) booking.numberOfRooms = Math.max(1, parseInt(numberOfRooms, 10) || 1);
        if (numberOfBeds !== undefined) booking.numberOfBeds = Math.max(1, parseInt(numberOfBeds, 10) || 1);
        if (roomType !== undefined) booking.roomType = roomType;
        if (message !== undefined) booking.message = message;

        // Reset status to pending upon re-sending
        booking.status = 'pending';
        await booking.save();

        console.log(`[updateBooking] booking=${booking._id} updated and reset to pending`);

        await logActivity({
            action: 'UPDATE',
            targetModel: 'Booking',
            targetId: booking._id,
            details: { specialNote, studentPhone, status: 'pending' },
            req,
        });

        res.json({ booking });
    } catch (error) {
        console.error('[updateBooking] Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

const normalizePaymentMethod = (method) => {
    const value = String(method || '').trim().toLowerCase();
    if (value === 'bank' || value === 'bank_transfer') return 'bank_transfer';
    if (value === 'cash') return 'cash';
    return null;
};
const isUploadedImage = (value) => typeof value === 'string'
    && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(value)
    && value.length > 100;

const paymentAmountFor = (boarding, beds, monthNumber) => {
    const rent = Number(boarding?.pricePerMonth) * Math.max(1, Number(beds) || 1);
    if (!Number.isFinite(rent) || rent <= 0) return 0;
    return monthNumber === 1 ? rent * 2 : rent;
};

const submitAgreementAndPayment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid booking ID' });
        }
        const { signedByName, digitalSignature, paymentMethod, paymentReceipt, monthNumber = 1, notes, branch, paidAt } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (!isBookingClient(req.user) || !bookingBelongsToClient(booking, req.user)) {
            return res.status(403).json({ message: 'Only the client who made this booking can submit payment' });
        }
        if (booking.status !== 'confirmed') {
            return res.status(409).json({ message: 'The booking must be confirmed before payment can be submitted' });
        }

        const mNum = Number.parseInt(monthNumber, 10);
        const signedName = String(signedByName || '').trim();
        const pMethod = normalizePaymentMethod(paymentMethod || 'bank_transfer');
        const pReceipt = pMethod === 'cash' ? '' : (typeof paymentReceipt === 'string' ? paymentReceipt : '');
        const boarding = await Boarding.findById(booking.boarding);
        const expectedAmount = paymentAmountFor(boarding, booking.numberOfBeds, 1);
        if (mNum !== 1 || !signedName) return res.status(400).json({ message: 'A signed agreement and a valid first-month payment are required' });
        if (!pMethod) return res.status(400).json({ message: 'Choose bank transfer or cash handover' });
        if (!expectedAmount) return res.status(409).json({ message: 'The boarding price is not available for payment' });
        if (pMethod === 'bank_transfer' && (!booking.ownerBankDetails?.accountNumber || !isUploadedImage(pReceipt))) {
            return res.status(400).json({ message: 'Owner bank details and a real transfer slip are required for bank transfer' });
        }

        const existing = (booking.payments || []).find((payment) => payment.monthNumber === 1);
        if (existing?.status === 'confirmed') return res.status(409).json({ message: 'The first-month payment is already confirmed' });

        const paidDate = paidAt ? new Date(paidAt) : new Date();
        booking.agreementStatus = 'signed';
        booking.signedByName = signedName;
        booking.digitalSignature = String(digitalSignature || signedName);
        booking.signedDate = new Date();
        booking.paymentStatus = 'pending_confirmation';
        booking.paymentMethod = pMethod;
        booking.paymentReceipt = pReceipt;

        const paymentRecord = {
            monthNumber: 1,
            monthTitle: 'Month 1 (Move-In & Key Money Deposit)',
            amount: expectedAmount,
            status: 'pending_confirmation',
            paymentMethod: pMethod,
            receiptImage: pReceipt,
            paidAt: Number.isNaN(paidDate.getTime()) ? new Date() : paidDate,
            branch: branch || '',
            notes: notes || (pMethod === 'cash' ? 'Cash handover requested' : (branch ? `Branch: ${branch}` : '')),
        };
        const existingIndex = (booking.payments || []).findIndex((payment) => payment.monthNumber === 1);
        if (existingIndex >= 0) booking.payments[existingIndex] = { ...booking.payments[existingIndex]._doc, ...paymentRecord };
        else booking.payments.push(paymentRecord);

        await booking.save();
        res.json({ success: true, booking });
    } catch (error) {
        console.error('[submitAgreementAndPayment] Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc Confirm client payment by owner
// @route PUT /api/bookings/:id/confirm-payment
const confirmClientPayment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid booking ID' });
        }
        const { monthNumber = 1 } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (!isBoardingOwner(req.user) || !bookingBelongsToOwner(booking, req.user)) {
            return res.status(403).json({ message: 'Only this listing’s owner can confirm its payments' });
        }
        if (booking.status !== 'confirmed') return res.status(409).json({ message: 'Only confirmed bookings can have payments verified' });

        const mNum = Number.parseInt(monthNumber, 10);
        if (!Number.isInteger(mNum) || mNum < 1 || mNum > 11) return res.status(400).json({ message: 'A valid payable month is required' });
        let payItem = (booking.payments || []).find((payment) => payment.monthNumber === mNum);
        if (!payItem && mNum === 1 && booking.paymentStatus === 'pending_confirmation') {
            const method = normalizePaymentMethod(booking.paymentMethod || 'bank_transfer');
            const boarding = await Boarding.findById(booking.boarding);
            const amount = paymentAmountFor(boarding, booking.numberOfBeds, 1);
            if (!method || !amount || (method === 'bank_transfer' && !booking.paymentReceipt)) {
                return res.status(409).json({ message: 'There is no valid pending payment to verify' });
            }
            booking.payments.push({
                monthNumber: 1,
                monthTitle: 'Month 1 (Move-In & Key Money Deposit)',
                amount,
                status: 'pending_confirmation',
                paymentMethod: method,
                receiptImage: method === 'cash' ? '' : booking.paymentReceipt,
                paidAt: booking.updatedAt || new Date(),
            });
            payItem = booking.payments[booking.payments.length - 1];
        }
        if (!payItem || payItem.status !== 'pending_confirmation') {
            return res.status(409).json({ message: 'There is no pending payment for this month to verify' });
        }
        payItem.status = 'confirmed';
        payItem.confirmedAt = new Date();

        const hasPending = booking.payments.some((payment) => payment.status === 'pending_confirmation');
        const hasConfirmed = booking.payments.some((payment) => payment.status === 'confirmed');
        booking.paymentStatus = hasPending ? 'pending_confirmation' : (hasConfirmed ? 'confirmed' : 'unpaid');

        const nextMonthNum = mNum + 1;
        const hasNextMonth = booking.payments.some((payment) => payment.monthNumber === nextMonthNum);
        if (!hasNextMonth && nextMonthNum <= 11) {
            const boarding = await Boarding.findById(booking.boarding);
            const nextAmount = paymentAmountFor(boarding, booking.numberOfBeds, nextMonthNum);
            if (nextAmount) {
                booking.payments.push({
                    monthNumber: nextMonthNum,
                    monthTitle: `Month ${nextMonthNum} (Monthly Rent)`,
                    amount: nextAmount,
                    status: 'unpaid',
                    paymentMethod: 'bank_transfer',
                    notes: 'Upcoming monthly rent',
                });
            }
        }

        await booking.save();
        console.log(`[confirmClientPayment] booking=${booking._id} month=${mNum} confirmed`);

        res.json({ success: true, booking });
    } catch (error) {
        console.error('[confirmClientPayment] Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

const submitMonthlyPayment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid booking ID' });
        }
        const { monthNumber, amount, paymentMethod, paymentReceipt, notes, branch, paidAt, monthTitle } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (!isBookingClient(req.user) || !bookingBelongsToClient(booking, req.user)) {
            return res.status(403).json({ message: 'Only the client who made this booking can submit payment' });
        }
        if (booking.status !== 'confirmed') return res.status(409).json({ message: 'The booking must be confirmed before payment can be submitted' });

        const mNum = Number.parseInt(monthNumber, 10);
        if (!Number.isInteger(mNum) || mNum < 2 || mNum > 11) return res.status(400).json({ message: 'Choose a payable month between 2 and 11' });
        const pMethod = normalizePaymentMethod(paymentMethod || 'bank_transfer');
        const pReceipt = pMethod === 'cash' ? '' : (typeof paymentReceipt === 'string' ? paymentReceipt : '');
        if (!pMethod) return res.status(400).json({ message: 'Choose bank transfer or cash handover' });
        if (pMethod === 'bank_transfer' && (!booking.ownerBankDetails?.accountNumber || !isUploadedImage(pReceipt))) {
            return res.status(400).json({ message: 'Owner bank details and a real transfer slip are required for bank transfer' });
        }
        const boarding = await Boarding.findById(booking.boarding);
        const expectedAmount = paymentAmountFor(boarding, booking.numberOfBeds, mNum);
        if (!expectedAmount) return res.status(409).json({ message: 'The boarding price is not available for payment' });
        const payItem = (booking.payments || []).find((payment) => payment.monthNumber === mNum);
        if (payItem?.status === 'confirmed') return res.status(409).json({ message: 'This month is already paid and confirmed' });

        const paidDate = paidAt ? new Date(paidAt) : new Date();
        const pNotes = notes || (branch ? `Branch: ${branch}` : (pMethod === 'cash' ? 'Cash handover requested' : ''));
        const paymentRecord = {
            monthNumber: mNum,
            monthTitle: monthTitle || `Month ${mNum} (Monthly Rent)`,
            amount: expectedAmount,
            status: 'pending_confirmation',
            paymentMethod: pMethod,
            receiptImage: pReceipt,
            paidAt: Number.isNaN(paidDate.getTime()) ? new Date() : paidDate,
            branch: branch || '',
            notes: pNotes,
        };
        if (payItem) Object.assign(payItem, paymentRecord);
        else booking.payments.push(paymentRecord);

        booking.paymentStatus = 'pending_confirmation';
        await booking.save();

        console.log(`[submitMonthlyPayment] booking=${booking._id} month=${mNum} submitted`);
        res.json({ success: true, booking });
    } catch (error) {
        console.error('[submitMonthlyPayment] Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createBooking,
    getBookings,
    updateBookingStatus,
    updateBooking,
    submitAgreementAndPayment,
    confirmClientPayment,
    submitMonthlyPayment,
};
