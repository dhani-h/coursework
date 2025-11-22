require('dotenv').config();
console.log("Loaded MONGO_URI:", process.env.MONGO_URI);

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGO_URI);

let lessonsCollection;
let ordersCollection;

async function startServer() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = client.db('school'); // Database name
    lessonsCollection = db.collection('lessons');
    ordersCollection = db.collection('orders');

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}
startServer();

/////////////////////////////////////
// ROUTES
/////////////////////////////////////

// GET all lessons
app.get('/lessons', async (req, res) => {
  try {
    const lessons = await lessonsCollection.find({}).toArray();
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEARCH lessons
app.get('/search', async (req, res) => {
  const q = req.query.q?.toLowerCase() || '';
  try {
    const lessons = await lessonsCollection.find({}).toArray();
    const filtered = lessons.filter(l =>
      l.subject.toLowerCase().includes(q) ||
      l.location.toLowerCase().includes(q) ||
      l.price.toString().includes(q) ||
      l.spaces.toString().includes(q)
    );
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST orders
app.post('/orders', async (req, res) => {
  const { name, phone, items } = req.body;

  if (!name || !phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  try {
    // Save order
    const orderResult = await ordersCollection.insertOne({
      name,
      phone,
      items,
      createdAt: new Date(),
    });

    // Update lesson spaces
    for (const item of items) {
      const lesson = await lessonsCollection.findOne({ _id: ObjectId(item.lessonId) });
      if (lesson) {
        const newSpaces = lesson.spaces - item.qty;
        await lessonsCollection.updateOne(
          { _id: ObjectId(item.lessonId) },
          { $set: { spaces: newSpaces >= 0 ? newSpaces : 0 } }
        );
      }
    }

    res.json({ message: 'Order placed successfully', orderId: orderResult.insertedId });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: err.message });
  }
});