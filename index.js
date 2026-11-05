// Shohojog Server - Social Development Events Platform

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000', process.env.CLIENT_URL],
  credentials: true
}));
app.use(express.json());

// MongoDB Connect
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected - Shohojog'))
  .catch((err) => console.log('MongoDB Error:', err.message));

// Event Model
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  eventType: { type: String, required: true },
  thumbnail: { type: String, required: true },
  location: { type: String, required: true },
  eventDate: { type: Date, required: true },
  creatorEmail: { type: String, required: true },
  creatorName: { type: String, default: '' },
  creatorPhoto: { type: String, default: '' },
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

// Joined Model - Kon user kon event e join korse
const joinedSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, default: '' },
  userPhoto: { type: String, default: '' },
}, { timestamps: true });

// Ek user ek event e 1 bar e join korte parbe
joinedSchema.index({ eventId: 1, userEmail: 1 }, { unique: true });

const Joined = mongoose.model('Joined', joinedSchema);

// JWT Middleware - Protected routes er jonno token check kore
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized - No token' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden - Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

app.get('/', (req, res) => {
  res.send('Shohojog Server is Running...');
});

// POST JWT Token - Client login er por ei API ke email pathabe, server token dibe
app.post('/api/auth/token', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).send({ message: 'Email is required' });
  }
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.send({ token });
});

// Get all upcoming events with search and type filter
app.get('/api/events', async (req, res) => {
  try {
    const { search = '', type = '' } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filter = { eventDate: { $gte: today } };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (type && type !== 'All') {
      filter.eventType = type;
    }
    const events = await Event.find(filter).sort({ eventDate: 1 });
    res.send(events);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// GET Recent 6 Upcoming Events
app.get('/api/events/recent', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = await Event.find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 })
      .limit(6);
    res.send(events);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// GET My Created Events - Manage Page - JWT Protected
app.get('/api/events/my/:email', verifyToken, async (req, res) => {
  try {
    if (req.user.email !== req.params.email) {
      return res.status(403).send({ message: 'Forbidden - Not your events' });
    }
    const events = await Event.find({ creatorEmail: req.params.email }).sort({ eventDate: 1 });
    res.send(events);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// GET Single Event Details - Public
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).send({ message: 'Event not found' });
    }
    res.send(event);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// POST Create Event - JWT Protected
app.post('/api/events', verifyToken, async (req, res) => {
  try {
    const { title, description, eventType, thumbnail, location, eventDate, creatorName, creatorPhoto } = req.body;
    if (!title || !description || !eventType || !thumbnail || !location || !eventDate) {
      return res.status(400).send({ message: 'All fields are required' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(eventDate);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return res.status(400).send({ message: 'Past date is not allowed' });
    }
    const newEvent = new Event({
      title,
      description,
      eventType,
      thumbnail,
      location,
      eventDate: selectedDate,
      creatorEmail: req.user.email,
      creatorName: creatorName || '',
      creatorPhoto: creatorPhoto || '',
    });
    const saved = await newEvent.save();
    res.status(201).send(saved);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// PUT Update Event - JWT + Only Own Event
app.put('/api/events/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).send({ message: 'Event not found' });
    }
    if (event.creatorEmail !== req.user.email) {
      return res.status(403).send({ message: 'Forbidden - Not your event' });
    }
    const { title, description, eventType, thumbnail, location, eventDate } = req.body;
    if (eventDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(eventDate);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        return res.status(400).send({ message: 'Past date is not allowed' });
      }
    }
    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { title, description, eventType, thumbnail, location, eventDate },
      { new: true, runValidators: true }
    );
    res.send(updated);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// DELETE Event - JWT + Only Own Event
app.delete('/api/events/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).send({ message: 'Event not found' });
    }
    if (event.creatorEmail !== req.user.email) {
      return res.status(403).send({ message: 'Forbidden - Not your event' });
    }
    await Event.findByIdAndDelete(req.params.id);
    // Event delete hole tar sob join o delete
    await Joined.deleteMany({ eventId: req.params.id });
    res.send({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// POST Join Event - JWT Protected, Duplicate check
app.post('/api/joined', verifyToken, async (req, res) => {
  try {
    const { eventId, userName, userPhoto } = req.body;
    if (!eventId) {
      return res.status(400).send({ message: 'Event ID is required' });
    }
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).send({ message: 'Event not found' });
    }
    const already = await Joined.findOne({ eventId, userEmail: req.user.email });
    if (already) {
      return res.status(400).send({ message: 'You already joined this event' });
    }
    const joined = new Joined({
      eventId,
      userEmail: req.user.email,
      userName: userName || '',
      userPhoto: userPhoto || '',
    });
    const saved = await joined.save();
    res.status(201).send(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).send({ message: 'You already joined this event' });
    }
    res.status(500).send({ message: err.message });
  }
});

// GET My Joined Events - JWT Protected, Nearest date first
app.get('/api/joined/:email', verifyToken, async (req, res) => {
  try {
    if (req.user.email !== req.params.email) {
      return res.status(403).send({ message: 'Forbidden' });
    }
    const joinedList = await Joined.find({ userEmail: req.params.email })
      .populate('eventId')
      .sort({ createdAt: -1 });
    // Event delete hoye gele null asbe, oigulo bad dao
    const events = joinedList
      .filter((j) => j.eventId)
      .map((j) => j.eventId);
    // Nearest date first
    events.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    res.send(events);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// GET Joined Count + Check if I joined - Public count, check er jonno email query
app.get('/api/joined/count/:eventId', async (req, res) => {
  try {
    const count = await Joined.countDocuments({ eventId: req.params.eventId });
    let isJoined = false;
    if (req.query.email) {
      const found = await Joined.findOne({ eventId: req.params.eventId, userEmail: req.query.email });
      if (found) isJoined = true;
    }
    const volunteers = await Joined.find({ eventId: req.params.eventId }).limit(10);
    res.send({ count, isJoined, volunteers });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// DELETE Leave Event - JWT Protected
app.delete('/api/joined/:eventId', verifyToken, async (req, res) => {
  try {
    const deleted = await Joined.findOneAndDelete({ eventId: req.params.eventId, userEmail: req.user.email });
    if (!deleted) {
      return res.status(404).send({ message: 'Join not found' });
    }
    res.send({ message: 'Left event successfully' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Shohojog Server running on port ' + PORT);
});

