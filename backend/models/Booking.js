const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    boarding: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boarding',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'cancelled'],
      default: 'pending',
    },
    // New booking form fields
    numberOfRooms: {
      type: Number,
      default: 1,
    },
    numberOfBeds: {
      type: Number,
      default: 1,
    },
    roomType: {
      type: String,
      default: 'Separate Rooms',
    },
    specialNote: {
      type: String,
      default: '',
    },
    boardingName: {
      type: String,
      default: '',
    },
    studentName: {
      type: String,
      default: '',
    },
    studentEmail: {
      type: String,
      default: '',
    },
    studentPhone: {
      type: String,
      default: '',
    },
    ownerCancelMessage: {
      type: String,
      default: '',
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    // Tenancy Agreement & Digital Signature
    agreementStatus: {
      type: String,
      enum: ['pending', 'signed'],
      default: 'pending',
    },
    signedByName: {
      type: String,
      default: '',
    },
    signedDate: {
      type: Date,
    },
    digitalSignature: {
      type: String,
      default: '',
    },
    // Overall Payment State
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending_confirmation', 'confirmed'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      default: 'bank_transfer',
    },
    paymentReceipt: {
      type: String,
      default: '',
    },
    // Owner Bank Account Details (provided upon booking confirmation)
    ownerBankDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      branchName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
    },
    // Continuous Monthly Payments Ledger
    payments: [
      {
        monthNumber: {
          type: Number,
          default: 1,
        },
        monthTitle: {
          type: String,
          default: 'Month 1 (Move-in & Key Money)',
        },
        amount: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ['unpaid', 'pending_confirmation', 'confirmed'],
          default: 'unpaid',
        },
        paymentMethod: {
          type: String,
          default: 'bank_transfer',
        },
        receiptImage: {
          type: String,
          default: '',
        },
        paidAt: {
          type: Date,
        },
        confirmedAt: {
          type: Date,
        },
        branch: {
          type: String,
          default: '',
        },
        notes: {
          type: String,
          default: '',
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
