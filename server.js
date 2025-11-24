// backend/server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so GitHub Pages can fetch data
app.use(cors());
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Serve images from backend
app.use('/images', express.static(path.join(__dirname, '../images')));

// MongoDB connection
const uri = "mongodb+srv://dhanishta:dhanishta@cluster0.egzooh2.mongodb.net/school?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function start() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("school");
    const lessons = db.collection("lessons");
    const orders = db.collection("orders");

    // GET lessons
    app.get('/lessons', async (req, res) => {
      const data = await lessons.find({}).toArray();
      res.json(data);
    });

    // POST orders
    app.post('/orders', async (req, res) => {
      const { name, phone, lessonIDs, spaces } = req.body;
      if (!name || !phone || !lessonIDs || !spaces)
        return res.status(400).json({ error: "Missing order fields" });

      const order = { name, phone, lessonIDs, spaces };
      const result = await orders.insertOne(order);

      for (let i = 0; i < lessonIDs.length; i++) {
        await lessons.updateOne(
          { _id: new ObjectId(lessonIDs[i]) },
          { $inc: { spaces: -spaces[i] } }
        );
      }

      res.status(201).json({ message: "Order submitted", orderId: result.insertedId });
    });

    // Optional: health check
    app.get('/', (req, res) => res.send('Backend running'));

    // Start server
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

start();
