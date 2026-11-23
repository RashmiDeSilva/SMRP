const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Boarding = require('../models/Boarding');
const Booking = require('../models/Booking');

const BACKUP_FILE = path.join(__dirname, '../data_backup.json');

const restoreData = async () => {
  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      console.log('[persistentStorage] No previous backup file found. Seeding default accounts...');
      await seedDefaults();
      return;
    }

    const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
    const data = JSON.parse(raw);

    if (data.users && data.users.length) {
      for (const u of data.users) {
        await User.updateOne({ email: u.email }, { $set: u }, { upsert: true });
      }
      console.log(`[persistentStorage] Restored ${data.users.length} users from disk backup`);
    }

    const owners = await User.find({ role: 'owner' }).select('_id email').lean();
    const ownersByEmail = new Map(owners.map((owner) => [String(owner.email || '').toLowerCase(), owner._id]));
    const onlyOwnerId = owners.length === 1 ? owners[0]._id : null;
    if (data.boardings && data.boardings.length) {
      for (const b of data.boardings) {
        if (!b.owner) {
          const legacyOwnerEmail = String(b.ownerEmail || '').toLowerCase();
          b.owner = ownersByEmail.get(legacyOwnerEmail) || onlyOwnerId;
        }
        await Boarding.updateOne({ _id: b._id }, { $set: b }, { upsert: true });
      }
      console.log(`[persistentStorage] Restored ${data.boardings.length} boardings from disk backup`);
    }

    // Migrate legacy listings without an owner only when the account is unambiguous.
    if (onlyOwnerId) {
      await Boarding.updateMany({ $or: [{ owner: { $exists: false } }, { owner: null }] }, { $set: { owner: onlyOwnerId } });
    }

    if (data.bookings && data.bookings.length) {
      const boardingOwners = new Map(
        (await Boarding.find({}).select('_id owner').lean()).map((boarding) => [String(boarding._id), boarding.owner])
      );
      for (const bk of data.bookings) {
        if (!bk.owner && bk.boarding) bk.owner = boardingOwners.get(String(bk.boarding));
        await Booking.updateOne({ _id: bk._id }, { $set: bk }, { upsert: true });
      }
      console.log(`[persistentStorage] Restored ${data.bookings.length} bookings from disk backup`);
    }
  } catch (err) {
    console.error('[persistentStorage] Restore error:', err.message);
  }
};

const saveData = async () => {
  try {
    const users = await User.find({}).lean();
    const boardings = await Boarding.find({}).lean();
    const bookings = await Booking.find({}).lean();

    const data = {
      users,
      boardings,
      bookings,
      lastSaved: new Date().toISOString(),
    };
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[persistentStorage] Save error:', err.message);
  }
};

const seedDefaults = async () => {
  try {
    const bcrypt = require('bcryptjs');
    const ownerHashed = await bcrypt.hash('owner123', 10);
    const studentHashed = await bcrypt.hash('student123', 10);
    const defaultHashed = await bcrypt.hash('123456', 10);

    const defaultUsers = [
      { name: 'Student 5', email: 'student5@gmail.com', password: studentHashed, role: 'student' },
      { name: 'Owner 5', email: 'owner5@gmail.com', password: ownerHashed, role: 'owner' },
      { name: 'Employee Demo', email: 'employee@gmail.com', password: defaultHashed, role: 'employee' },
      { name: 'Intern Demo', email: 'intern@gmail.com', password: defaultHashed, role: 'intern' },
    ];

    for (const u of defaultUsers) {
      await User.updateOne({ email: u.email }, { $set: u }, { upsert: true });
    }
    const defaultOwner = await User.findOne({ email: 'owner5@gmail.com' }).select('_id');

    // Default sample boarding place for owner5
    const existingBoardings = await Boarding.countDocuments();
    if (existingBoardings === 0) {
      await Boarding.create({
        boardingName: 'Hilltop Student Residence',
        boardingType: 'Apartment',
        location: 'Kandy Road, Malabe',
        pricePerMonth: '15000',
        availableRooms: 3,
        availableBeds: 6,
        totalRooms: 4,
        totalBeds: 8,
        bedsPerRoom: 'Two Beds per Room (2 Beds/Room)',
        ownerEmail: 'owner5@gmail.com',
        owner: defaultOwner?._id,
        contactNumber: '077 123 4567',
        facilities: { wifi: true, parking: true },
        rules: 'Quiet hours between 10:00 PM and 6:00 AM. Keep common areas clean.',
      });
    }

    await saveData();
    console.log('[persistentStorage] Default accounts & boardings seeded and saved.');
  } catch (e) {
    console.log('[persistentStorage] Seed error:', e.message);
  }
};

let intervalId = null;
const startAutoSave = () => {
  if (!intervalId) {
    intervalId = setInterval(saveData, 5000);
  }
};

module.exports = {
  restoreData,
  saveData,
  startAutoSave,
};
