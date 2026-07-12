require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Simulated Email Service
function sendSimulatedEmail(to, subject, body) {
  console.log('\n======================================================');
  console.log('📧 SIMULATED EMAIL SENT');
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('------------------------------------------------------');
  console.log(body);
  console.log('======================================================\n');
}

// ZONES configuration
const SEATS_PER_ZONE = 50;
const ZONES = [
  { id: 'silent', name: 'Silent Study Zone', capacity: SEATS_PER_ZONE },
  { id: 'collab', name: 'Collaborative Zone', capacity: SEATS_PER_ZONE },
  { id: 'computers', name: 'Computer Lab', capacity: SEATS_PER_ZONE },
  { id: 'reading', name: 'Reading Room', capacity: SEATS_PER_ZONE }
];

// MongoDB Connection Setup
const MONGO_URI = process.env.MONGO_URI;
let isConnected = false;
let lastCleanup = 0;

// Define Schemas
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }
});

const sessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const bookSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  department: { type: String, required: true },
  section: { type: String, required: true },
  availableCopies: { type: Number, required: true },
  totalCopies: { type: Number, required: true },
  reservedByUserIds: [{ type: String }],
  issuedByUserIds: [{ type: String }]
});

const activeIssueSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  bookId: { type: String, required: true },
  userId: { type: String, required: true },
  issuedDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true }
});

const fineSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  bookId: { type: String, required: true },
  issueId: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  date: { type: Date, default: Date.now }
});

const seatBookingSchema = new mongoose.Schema({
  zoneId: { type: String, required: true },
  seatNumber: { type: Number, required: true },
  userId: { type: String, required: true },
  slot: { type: String, required: true },
  bookedAt: { type: Date, default: Date.now },
  isCheckedIn: { type: Boolean, default: false }
});

const librarySettingsSchema = new mongoose.Schema({
  branchSelector: { type: String, default: 'All Branches' },
  maxBooksPerStudent: { type: Number, default: 2 },
  seatBookingTimeLimit: { type: Number, default: 120 },
  emailAlerts: { type: Boolean, default: true },
  dueDateReminders: { type: Boolean, default: true },
  newBookAlerts: { type: Boolean, default: false }
});

// Compile Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
const Book = mongoose.models.Book || mongoose.model('Book', bookSchema);
const ActiveIssue = mongoose.models.ActiveIssue || mongoose.model('ActiveIssue', activeIssueSchema);
const Fine = mongoose.models.Fine || mongoose.model('Fine', fineSchema);
const SeatBooking = mongoose.models.SeatBooking || mongoose.model('SeatBooking', seatBookingSchema);
const LibrarySettings = mongoose.models.LibrarySettings || mongoose.model('LibrarySettings', librarySettingsSchema);

// Initial default data for seeding
const initialBooks = [
  { id: 'b1', title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', department: 'BE CSE', section: 'Core Modules', availableCopies: 2, totalCopies: 5, reservedByUserIds: [], issuedByUserIds: ['u3'] },
  { id: 'b2', title: 'Artificial Intelligence: A Modern Approach', author: 'Russell, Norvig', department: 'BE CSE', section: 'Electives', availableCopies: 1, totalCopies: 3, reservedByUserIds: [], issuedByUserIds: [] },
  { id: 'b3', title: 'Deep Learning', author: 'Goodfellow, Bengio, Courville', department: 'BE CSE', section: 'Electives', availableCopies: 0, totalCopies: 2, reservedByUserIds: [], issuedByUserIds: [] },
  { id: 'b4', title: 'Clean Code', author: 'Robert C. Martin', department: 'BE CSE', section: 'Foundation', availableCopies: 4, totalCopies: 4, reservedByUserIds: [], issuedByUserIds: [] },
  { id: 'b5', title: 'Pharmacy Practice and The Law', author: 'Richard R. Abood', department: 'B Pharmacy', section: 'Law & Ethics', availableCopies: 5, totalCopies: 8, reservedByUserIds: [], issuedByUserIds: [] },
  { id: 'b6', title: 'Pharmacology', author: 'Lippincott Williams & Wilkins', department: 'B Pharmacy', section: 'Core Subjects', availableCopies: 2, totalCopies: 4, reservedByUserIds: [], issuedByUserIds: [] },
  { id: 'b7', title: 'Data Structures and Algorithms in Java', author: 'Michael T. Goodrich, Roberto Tamassia', department: 'BCA', section: 'Programming', availableCopies: 6, totalCopies: 6, reservedByUserIds: [], issuedByUserIds: [] },
  { id: 'b8', title: 'Operating System Concepts', author: 'Abraham Silberschatz', department: 'BCA', section: 'Systems', availableCopies: 1, totalCopies: 5, reservedByUserIds: [], issuedByUserIds: [] },
  { id: 'b9', title: 'Fundamentals of Nursing', author: 'Patricia A. Potter', department: 'Nursing', section: 'First Year', availableCopies: 4, totalCopies: 7, reservedByUserIds: [], issuedByUserIds: [] },
  { id: 'b10', title: 'Medical-Surgical Nursing', author: 'Sharon L. Lewis', department: 'Nursing', section: 'Second Year', availableCopies: 3, totalCopies: 6, reservedByUserIds: [], issuedByUserIds: [] }
];

// Seed function
async function seedDatabase() {
  const bookCount = await Book.countDocuments();
  if (bookCount === 0) {
    await Book.insertMany(initialBooks);
    console.log('Seeded default books catalogue');
  }

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const salt = await bcrypt.genSalt(10);
    const johnPwdHash = await bcrypt.hash('123', salt);
    await User.create({
      id: 'u3',
      name: 'John Doe',
      email: 'john@library.com',
      passwordHash: johnPwdHash,
      isAdmin: false
    });
    console.log('Seeded default user John Doe');
  }

  // Pre-seed the admin accounts requested
  const adminsToSeed = [
    { email: 'admin@library.com', name: 'Administrator', pass: 'admin123' },
    { email: 'jatinsharma00877@gmail.com', name: 'Jatin Sharma', pass: '123456' }
  ];

  for (const admin of adminsToSeed) {
    const exists = await User.findOne({ email: admin.email });
    if (!exists) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(admin.pass, salt);
      await User.create({
        id: uuidv4(),
        name: admin.name,
        email: admin.email,
        passwordHash: hashed,
        isAdmin: true
      });
      console.log(`Seeded admin user: ${admin.email}`);
    }
  }

  const issueCount = await ActiveIssue.countDocuments();
  if (issueCount === 0) {
    await ActiveIssue.create({
      id: 'i1',
      bookId: 'b1',
      userId: 'u3',
      issuedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), 
      dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    });
    console.log('Seeded default active issues');
  }

  const fineCount = await Fine.countDocuments();
  if (fineCount === 0) {
    await Fine.create({
      id: 'f1',
      userId: 'u3',
      bookId: 'b1',
      amount: 5,
      status: 'pending',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    });
    console.log('Seeded default fines');
  }

  const settingsCount = await LibrarySettings.countDocuments();
  if (settingsCount === 0) {
    await LibrarySettings.create({
      branchSelector: 'All Branches',
      maxBooksPerStudent: 2,
      seatBookingTimeLimit: 120,
      emailAlerts: true,
      dueDateReminders: true,
      newBookAlerts: false
    });
    console.log('Seeded default library settings');
  }
}

// Seat booking auto-expiry logic
const EXPIRY_MS = 20 * 60 * 1000; // 20 minutes

async function cleanExpiredBookings() {
  const now = new Date();
  const bookings = await SeatBooking.find({ isCheckedIn: false });
  
  for (const booking of bookings) {
    if (booking.slot) {
      const startTimeStr = booking.slot.split(/[\s\-]+/)[0];
      if (startTimeStr) {
        const [hours, minutes] = startTimeStr.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const slotStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
          const timeSinceSlotStart = now.getTime() - slotStartTime.getTime();
          
          if (timeSinceSlotStart > EXPIRY_MS) {
            console.log(`Auto-expiring seat ${booking.seatNumber} in zone ${booking.zoneId} slot ${booking.slot} for user ${booking.userId}`);
            
            await SeatBooking.deleteOne({ _id: booking._id });
            
            const bookingUser = await User.findOne({ id: booking.userId });
            if (bookingUser) {
              sendSimulatedEmail(
                bookingUser.email,
                'Seat Reservation Expired',
                `Hi ${bookingUser.name},\n\nWe noticed you didn't check in to Seat ${booking.seatNumber} in the ${booking.zoneId} within 20 minutes.\n\nYour reservation for ${booking.slot} has been released so others can study.\n\nBest,\nLibrary Team`
              );
            }
          }
        }
      }
    }
  }
}

async function connectDB() {
  if (isConnected) {
    if (Date.now() - lastCleanup > 30000) {
      lastCleanup = Date.now();
      cleanExpiredBookings().catch(err => console.error('Cleanup error:', err));
    }
    return;
  }
  if (!MONGO_URI) {
    console.error('MONGO_URI is missing');
    return;
  }
  const db = await mongoose.connect(MONGO_URI);
  isConnected = db.connections[0].readyState;
  console.log('MongoDB connection status:', isConnected);
  await seedDatabase();
  lastCleanup = Date.now();
}

// Database Connection Middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Helper functions for auth
async function findUserBySession(req) {
  const sessionId = req.header('x-session-id');
  if (sessionId) {
    const session = await Session.findOne({ id: sessionId });
    if (session) {
      const user = await User.findOne({ id: session.userId });
      if (user) return user;
    }
  }
  return null;
}

// Demand forecasting helpers
function baseDemandFactor(hour) {
  if (hour >= 9 && hour < 12) return 0.7;
  if (hour >= 12 && hour < 15) return 0.9;
  if (hour >= 15 && hour < 18) return 1.0;
  if (hour >= 18 && hour < 21) return 0.8;
  if (hour >= 21 || hour < 8) return 0.3;
  return 0.5;
}

function dayOfWeekFactor(day) {
  if (day === 0) return 0.4;
  if (day === 6) return 0.6;
  return 1.0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateCrowdForecast(currentRatio) {
  const baseChange = (Math.random() - 0.5) * 0.06;

  const trendBias =
    (currentRatio > 0.85 ? 0.03 : 0) -
    (currentRatio < 0.4 ? 0.03 : 0);

  const points = [15, 30, 60].map((minutesAhead, index) => {
    const noise = (Math.random() - 0.5) * 0.05;
    const stepMultiplier = 1 + index * 0.6;

    const delta = clamp(
      (baseChange + trendBias) * stepMultiplier + noise,
      -0.18,
      0.18
    );

    const predicted = clamp(currentRatio + delta, 0.05, 0.98);

    let label;
    if (predicted >= 0.85) label = 'Very busy';
    else if (predicted >= 0.65) label = 'Busy';
    else if (predicted >= 0.4) label = 'Moderate';
    else label = 'Quiet';

    return {
      minutesAhead,
      predictedOccupancyRatio: predicted,
      label
    };
  });

  const first = points[0];
  let overallLabel;
  if (first.predictedOccupancyRatio > currentRatio + 0.05) {
    overallLabel = 'Likely to get busier';
  } else if (first.predictedOccupancyRatio < currentRatio - 0.05) {
    overallLabel = 'Likely to get quieter';
  } else {
    overallLabel = 'Expected to stay similar';
  }

  return {
    currentInsight: {
      label: overallLabel,
      baselineOccupancyRatio: currentRatio
    },
    horizon: {
      forecastMinutesAhead: 60,
      points
    }
  };
}

async function generateSeatSnapshot() {
  const now = new Date();
  let totalCapacity = 0;
  let totalOccupied = 0;
  const zones = [];

  for (const zone of ZONES) {
    const occupied = await SeatBooking.countDocuments({ zoneId: zone.id });
    const available = zone.capacity - occupied;

    totalCapacity += zone.capacity;
    totalOccupied += occupied;

    zones.push({
      id: zone.id,
      name: zone.name,
      capacity: zone.capacity,
      occupied,
      available,
      occupancyRatio: occupied / zone.capacity
    });
  }

  const globalOccupancyRatio = totalOccupied / totalCapacity;
  const { currentInsight, horizon } = generateCrowdForecast(globalOccupancyRatio);

  let crowdLabel;
  if (globalOccupancyRatio >= 0.85) crowdLabel = 'Very busy';
  else if (globalOccupancyRatio >= 0.65) crowdLabel = 'Busy';
  else if (globalOccupancyRatio >= 0.4) crowdLabel = 'Moderate';
  else crowdLabel = 'Quiet';

  return {
    generatedAt: now.toISOString(),
    total: {
      capacity: totalCapacity,
      occupied: totalOccupied,
      available: totalCapacity - totalOccupied,
      occupancyRatio: globalOccupancyRatio,
      crowdLabel
    },
    zones,
    aiInsight: {
      forecastMinutesAhead: horizon.forecastMinutesAhead,
      forecastOccupancyRatio: horizon.points[0].predictedOccupancyRatio,
      forecastLabel: currentInsight.label,
      horizons: horizon.points
    }
  };
}

// -------- Auth endpoints --------
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(String(password), salt);
  const user = await User.create({
    id: uuidv4(),
    name: String(name),
    email: String(email).toLowerCase(),
    passwordHash,
    isAdmin: String(email).toLowerCase() === 'jatinsharma00877@gmail.com' || String(email).toLowerCase() === 'admin@library.com'
  });

  const sessionId = uuidv4();
  await Session.create({ id: sessionId, userId: user.id });

  sendSimulatedEmail(
    user.email,
    'Welcome to Library Insights Hub!',
    `Hi ${user.name},\n\nThanks for signing up. You can now book seats and reserve books from the dashboard.\n\nHappy studying!`
  );

  res.status(201).json({
    sessionId,
    user: { id: user.id, name: user.name, email: user.email, isAdmin: !!user.isAdmin }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required.' });
  }

  const normalizedEmail = String(email).toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  
  if (!user) {
    // Attempt automatic registration for new users (student)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password), salt);
    const name = String(email).split('@')[0];
    user = await User.create({
      id: uuidv4(),
      name: name,
      email: normalizedEmail,
      passwordHash,
      isAdmin: false
    });

    sendSimulatedEmail(
      user.email,
      'Welcome to Library Insights Hub!',
      `Hi ${user.name},\n\nThanks for signing up. You can now book seats and reserve books from the dashboard.\n\nHappy studying!`
    );
  } else {
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
  }

  const sessionId = uuidv4();
  await Session.create({ id: sessionId, userId: user.id });

  res.json({
    sessionId,
    user: { id: user.id, name: user.name, email: user.email, isAdmin: !!user.isAdmin }
  });
});

app.post('/api/auth/logout', async (req, res) => {
  const sessionId = req.header('x-session-id');
  if (sessionId) {
    await Session.deleteOne({ id: sessionId });
  }
  res.status(204).end();
});

app.get('/api/auth/me', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user) return res.status(401).json({ message: 'Not signed in.' });

  res.json({ user: { id: user.id, name: user.name, email: user.email, isAdmin: !!user.isAdmin } });
});

// -------- Seat booking --------
async function buildSeatMapResponse(zoneId, user, slot) {
  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return null;

  const bookings = await SeatBooking.find({ zoneId, slot });
  const userId = user ? user.id : null;

  const seats = [];
  for (let i = 1; i <= SEATS_PER_ZONE; i++) {
    const booking = bookings.find(b => b.seatNumber === i);
    seats.push({
      seatNumber: i,
      hasPower: i % 5 === 0,
      status: booking ? 'booked' : 'free',
      isMine: Boolean(userId && booking && booking.userId === userId),
      bookedAt: booking ? booking.bookedAt : null,
      isCheckedIn: booking ? booking.isCheckedIn : false
    });
  }

  return {
    zone: { id: zone.id, name: zone.name, capacity: zone.capacity },
    seats
  };
}

app.get('/api/seats/map', async (req, res) => {
  const { zoneId, slot } = req.query;
  if (!zoneId) return res.status(400).json({ message: 'zoneId is required.' });

  const user = await findUserBySession(req);
  const payload = await buildSeatMapResponse(zoneId, user, slot);
  if (!payload) return res.status(404).json({ message: 'Zone not found.' });

  res.json(payload);
});

app.post('/api/seats/bookSeat', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user) {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }

  const { zoneId, seatNumber, slot } = req.body || {};
  if (!slot) return res.status(400).json({ message: 'Time slot is required.' });
  
  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return res.status(400).json({ message: 'Invalid zone.' });

  if (Number(seatNumber) < 1 || Number(seatNumber) > SEATS_PER_ZONE) {
    return res.status(400).json({ message: 'Invalid seat number.' });
  }

  const existingBooking = await SeatBooking.findOne({ zoneId, seatNumber, slot });
  if (existingBooking) {
    if (existingBooking.userId === user.id) {
      return res.status(409).json({ message: 'You already booked this seat for this time.' });
    }
    return res.status(409).json({ message: 'Seat already booked for this time.' });
  }

  // Count existing bookings for this user in this slot
  const userBookingCount = await SeatBooking.countDocuments({ userId: user.id, slot });
  if (userBookingCount >= 2) {
    return res.status(409).json({ message: 'You can only book up to 2 seats per time slot across all library zones.' });
  }

  await SeatBooking.create({
    zoneId,
    seatNumber: Number(seatNumber),
    userId: user.id,
    slot,
    isCheckedIn: false
  });

  sendSimulatedEmail(
    user.email,
    'Seat Booking Confirmed',
    `Hi ${user.name},\n\nYou have successfully booked Seat ${seatNumber} in the ${zone.name} for the time slot ${slot}.\n\nYou have 20 minutes from the start of the booking to check in at the library or your seat will be automatically released.\n\nEnjoy!`
  );

  const payload = await buildSeatMapResponse(zone.id, user, slot);
  res.status(201).json({
    message: `Seat ${seatNumber} booked in ${zone.name}.`,
    seatMap: payload
  });
});

app.post('/api/seats/releaseSeat', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  const { zoneId, seatNumber, slot } = req.body || {};
  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return res.status(400).json({ message: 'Invalid zone.' });

  const booking = await SeatBooking.findOne({ zoneId, seatNumber: Number(seatNumber), slot, userId: user.id });
  if (!booking) {
    return res.status(404).json({ message: 'No booking found for this seat that belongs to you.' });
  }

  await SeatBooking.deleteOne({ _id: booking._id });

  const payload = await buildSeatMapResponse(zone.id, user, slot);
  res.status(200).json({
    message: `Seat ${seatNumber} released.`,
    seatMap: payload
  });
});

app.post('/api/seats/adminRelease', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const { zoneId, seatNumber, slot } = req.body || {};
  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return res.status(400).json({ message: 'Invalid zone.' });

  const booking = await SeatBooking.findOne({ zoneId, seatNumber: Number(seatNumber), slot });
  if (!booking) {
    return res.status(404).json({ message: 'No booking found for this seat.' });
  }

  await SeatBooking.deleteOne({ _id: booking._id });

  const payload = await buildSeatMapResponse(zone.id, user, slot);
  res.status(200).json({
    message: `Seat ${seatNumber} released.`,
    seatMap: payload
  });
});

app.post('/api/seats/checkIn', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user) {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }

  const { zoneId, seatNumber, slot, userId } = req.body || {};
  if (!zoneId || !seatNumber || !slot) {
    return res.status(400).json({ message: 'Missing check-in data.' });
  }

  let targetUser = user;
  if (user.isAdmin && userId) {
    targetUser = await User.findOne({ id: userId });
  }
  if (!targetUser) return res.status(404).json({ message: 'User not found.' });

  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return res.status(400).json({ message: 'Invalid zone.' });

  const booking = await SeatBooking.findOne({ zoneId, seatNumber: Number(seatNumber), slot, userId: targetUser.id });
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  if (booking.isCheckedIn) {
    return res.status(409).json({ message: 'Seat already checked in.' });
  }

  booking.isCheckedIn = true;
  await booking.save();

  const payload = await buildSeatMapResponse(zone.id, user, slot);
  res.status(200).json({
    message: `Successfully checked in to seat ${seatNumber}.`,
    seatMap: payload
  });
});

// -------- Admin Dashboard --------
app.get('/api/admin/data', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const allUsers = await User.find({});
  const allBookings = await SeatBooking.find({});
  
  const allSeatBookings = [];
  for (const b of allBookings) {
    const zone = ZONES.find(z => z.id === b.zoneId);
    const u = allUsers.find(x => x.id === b.userId);
    allSeatBookings.push({
      zoneId: b.zoneId,
      zoneName: zone ? zone.name : b.zoneId,
      seatNumber: b.seatNumber,
      slot: b.slot,
      userId: b.userId,
      userName: u ? u.name : 'Unknown User',
      userEmail: u ? u.email : 'Unknown',
      isCheckedIn: b.isCheckedIn
    });
  }

  const allBooks = await Book.find({});
  const branches = {};
  for (const b of allBooks) {
    if (!branches[b.department]) {
      branches[b.department] = {
        name: b.department,
        reservedBooks: [],
        issuedBooks: []
      };
    }

    const branch = branches[b.department];

    for (const userId of b.reservedByUserIds) {
      const u = allUsers.find(x => x.id === userId);
      branch.reservedBooks.push({
        id: b.id,
        title: b.title,
        userId: userId,
        userName: u ? u.name : 'Unknown User',
        userEmail: u ? u.email : 'Unknown'
      });
    }

    for (const userId of b.issuedByUserIds) {
      const u = allUsers.find(x => x.id === userId);
      branch.issuedBooks.push({
        id: b.id,
        title: b.title,
        userId: userId,
        userName: u ? u.name : 'Unknown User',
        userEmail: u ? u.email : 'Unknown'
      });
    }
  }

  res.json({
    users: allUsers.map(u => ({ id: u.id, name: u.name, email: u.email, isAdmin: !!u.isAdmin })),
    SeatBookings: allSeatBookings,
    branches: Object.values(branches),
    userId: user.id
  });
});

app.get('/api/admin/settings', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }
  let settings = await LibrarySettings.findOne({});
  if (!settings) {
    settings = await LibrarySettings.create({});
  }
  res.json(settings);
});

app.post('/api/admin/settings', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const { 
    branchSelector, 
    maxBooksPerStudent, 
    seatBookingTimeLimit,
    emailAlerts,
    dueDateReminders,
    newBookAlerts
  } = req.body || {};

  let settings = await LibrarySettings.findOne({});
  if (!settings) {
    settings = new LibrarySettings({});
  }

  if (typeof branchSelector === 'string') settings.branchSelector = branchSelector;
  if (typeof maxBooksPerStudent === 'number') settings.maxBooksPerStudent = maxBooksPerStudent;
  if (typeof seatBookingTimeLimit === 'number') settings.seatBookingTimeLimit = seatBookingTimeLimit;
  if (typeof emailAlerts === 'boolean') settings.emailAlerts = emailAlerts;
  if (typeof dueDateReminders === 'boolean') settings.dueDateReminders = dueDateReminders;
  if (typeof newBookAlerts === 'boolean') settings.newBookAlerts = newBookAlerts;

  await settings.save();

  res.status(200).json({ message: 'Settings updated successfully.', settings });
});

app.put('/api/admin/profile', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const { name, email } = req.body || {};
  
  if (name && typeof name === 'string' && name.trim().length > 0) {
    user.name = name.trim();
  }
  
  if (email && typeof email === 'string' && email.trim().length > 0) {
    const existing = await User.findOne({ email: email.trim(), id: { $ne: user.id } });
    if (existing) {
       return res.status(400).json({ message: 'Email is already in use by another account.' });
    }
    user.email = email.trim();
  }

  await user.save();

  res.status(200).json({ message: 'Profile updated successfully.', user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
});

app.post('/api/admin/books/issue', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const { bookId, userId } = req.body || {};
  const book = await Book.findOne({ id: bookId });

  if (!book) return res.status(404).json({ message: 'Book not found.' });

  const reservedIndex = book.reservedByUserIds.indexOf(userId);
  if (reservedIndex === -1) {
    return res.status(400).json({ message: 'User has not reserved this book.' });
  }

  // Move from reserved to issued
  book.reservedByUserIds.splice(reservedIndex, 1);
  book.issuedByUserIds.push(userId);
  await book.save();

  const u = await User.findOne({ id: userId });
  if (u) {
    sendSimulatedEmail(
      u.email,
      'Book Issued',
      `Hi ${u.name},\n\nYou have successfully picked up "${book.title}". Please return it within 14 days.\n\nHappy reading!`
    );
  }

  const issueRecord = {
    id: Date.now().toString(),
    bookId,
    userId,
    issuedDate: new Date(),
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  };
  await ActiveIssue.create(issueRecord);

  res.status(200).json({ message: 'Book successfully issued to user.' });
});

app.post('/api/admin/books/return', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const { bookId, userId } = req.body || {};
  const book = await Book.findOne({ id: bookId });

  if (!book) return res.status(404).json({ message: 'Book not found.' });

  const issuedIndex = book.issuedByUserIds.indexOf(userId);
  if (issuedIndex === -1) {
    return res.status(400).json({ message: 'User has not been issued this book.' });
  }

  book.issuedByUserIds.splice(issuedIndex, 1);
  book.availableCopies += 1;
  await book.save();

  const u = await User.findOne({ id: userId });
  if (u) {
    sendSimulatedEmail(
      u.email,
      'Book Returned',
      `Hi ${u.name},\n\nThank you for returning "${book.title}".\n\nHope you enjoyed it!`
    );
  }

  await ActiveIssue.deleteOne({ bookId, userId });

  res.status(200).json({ message: 'Book successfully returned.' });
});

// -------- Fines Management --------
app.get('/api/admin/fines', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const currentOverdue = [];
  const now = new Date();
  
  const allIssues = await ActiveIssue.find({});
  const allFines = await Fine.find({});
  const allBooks = await Book.find({});
  const allUsers = await User.find({});

  for (const issue of allIssues) {
    const due = new Date(issue.dueDate);
    if (now > due) {
      const diffTime = Math.abs(now - due);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const grossFine = diffDays * 1; 
      
      const paidFineAmount = allFines
        .filter(f => f.issueId === issue.id && f.status === 'paid')
        .reduce((sum, f) => sum + f.amount, 0);
      const amount = Math.max(0, grossFine - paidFineAmount);
      
      if (amount > 0) {
        const book = allBooks.find(b => b.id === issue.bookId);
        const u = allUsers.find(x => x.id === issue.userId);

        currentOverdue.push({
          issueId: issue.id,
          userId: issue.userId,
          bookId: issue.bookId,
          bookTitle: book ? book.title : 'Unknown Book',
          userName: u ? u.name : 'Unknown User',
          userEmail: u ? u.email : '',
          dueDate: issue.dueDate.toISOString(),
          overdueDays: diffDays,
          calculatedFine: amount
        });
      }
    }
  }

  const enrichedFines = allFines.map(f => {
    const book = allBooks.find(b => b.id === f.bookId);
    const u = allUsers.find(x => x.id === f.userId);
    return {
      id: f.id,
      userId: f.userId,
      bookId: f.bookId,
      issueId: f.issueId,
      amount: f.amount,
      status: f.status,
      date: f.date.toISOString(),
      bookTitle: book ? book.title : 'Unknown Book',
      userName: u ? u.name : 'Unknown User',
      userEmail: u ? u.email : ''
    };
  });

  res.json({
    overdueBooks: currentOverdue,
    recordedFines: enrichedFines
  });
});

app.post('/api/admin/fines/pay', async (req, res) => {
  const user = await findUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const { fineId, issueId, userId, bookId, amount } = req.body;

  if (fineId) {
    const fine = await Fine.findOne({ id: fineId });
    if (fine) {
      fine.status = 'paid';
      await fine.save();
      return res.json({ message: 'Fine marked as paid.' });
    }
    return res.status(404).json({ message: 'Fine not found.' });
  } else if (issueId) {
    await Fine.create({
      id: 'f_' + Date.now(),
      issueId,
      userId,
      bookId,
      amount,
      status: 'paid',
      date: new Date()
    });
    return res.json({ message: 'Fine recorded and marked as paid.' });
  }

  res.status(400).json({ message: 'Invalid fine data.' });
});

// -------- Books & reservations --------
app.get('/api/books', async (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  const allBooks = await Book.find({});

  let result = allBooks;
  if (query) {
    result = allBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(query) ||
        b.author.toLowerCase().includes(query) ||
        b.department.toLowerCase().includes(query) ||
        b.section.toLowerCase().includes(query)
    );
  }

  res.json({
    books: result.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      department: b.department,
      section: b.section,
      availableCopies: b.availableCopies,
      totalCopies: b.totalCopies,
      isReservable: b.availableCopies > 0,
      reservedByUserIds: b.reservedByUserIds
    }))
  });
});

app.post('/api/books/:id/reserve', async (req, res) => {
  let user = await findUserBySession(req);
  if (!user) {
    user = { id: 'guest_user', name: 'Guest User', email: 'guest@library.com' };
  }

  const book = await Book.findOne({ id: req.params.id });
  if (!book) return res.status(404).json({ message: 'Book not found.' });

  if (book.availableCopies <= 0) {
    return res.status(409).json({ message: 'No available copies to reserve.' });
  }

  if (user.id !== 'guest_user' && book.reservedByUserIds.includes(user.id)) {
    return res.status(409).json({ message: 'You have already reserved a copy of this book.' });
  }

  book.availableCopies -= 1;
  book.reservedByUserIds.push(user.id);
  await book.save();

  res.status(201).json({
    message: 'Book reserved successfully. Please collect it from the desk.',
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      availableCopies: book.availableCopies,
      totalCopies: book.totalCopies
    }
  });
});

app.get('/api/status', async (req, res) => {
  const snapshot = await generateSeatSnapshot();
  res.json(snapshot);
});

// -------- Analytics --------
app.get('/api/analytics/weekly', (req, res) => {
  const hours = [];
  for (let h = 8; h <= 22; h++) {
    hours.push(`${h}:00`);
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const datasets = [];

  for (let d = 0; d < days.length; d++) {
    const dayData = [];
    const dayFactor = dayOfWeekFactor(d === 6 ? 0 : d + 1);

    for (let h = 8; h <= 22; h++) {
      const base = baseDemandFactor(h) * dayFactor;
      const noise = (Math.random() - 0.5) * 0.2;
      const occupancy = clamp(base + noise, 0.1, 0.95);
      dayData.push(Math.round(occupancy * 200));
    }

    datasets.push({
      label: days[d],
      data: dayData
    });
  }

  res.json({
    labels: hours,
    datasets
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Export app and listen conditionally
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Library Insights Hub running on http://localhost:${PORT}`);
  });
}

module.exports = app;
