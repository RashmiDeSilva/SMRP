const express = require('express');
const {
    createBooking,
    getBookings,
    updateBookingStatus,
    updateBooking,
    submitAgreementAndPayment,
    confirmClientPayment,
    submitMonthlyPayment,
} = require('../controllers/bookingController');
const { protect, requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireAuth);

router.post('/', createBooking);
router.get('/', getBookings);
router.put('/:id/status', updateBookingStatus);
router.put('/:id/submit-payment', submitAgreementAndPayment);
router.put('/:id/confirm-payment', confirmClientPayment);
router.put('/:id/pay-monthly', submitMonthlyPayment);
router.put('/:id', updateBooking);

module.exports = router;
