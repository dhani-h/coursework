// backend/server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Fix favicon 404 (prevents browser warnings) ---
app.get('/favicon.ico', (req, res) => res.status(204).end());

// --- Serve images properly ---
app.use('/images', express.static(path.join(__dirname, '../images')));

// --- MongoDB ---
const uri = "mongodb+srv://dhanishta:dhanishta@cluster0.egzooh2.mongodb.net/school?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function start() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("school");
    const lessons = db.collection("lessons");
    const orders = db.collection("orders");

    // --- GET all lessons ---
    app.get('/lessons', async (req, res) => {
      const data = await lessons.find({}).toArray();
      res.json(data);
    });

    // --- GET all orders ---
    app.get('/orders', async (req, res) => {
      const data = await orders.find({}).toArray();
      res.json(data);
    });

    // --- POST new order ---
    app.post('/orders', async (req, res) => {
      const { name, phone, lessonIDs, spaces } = req.body;

      if (!name || !phone || !lessonIDs || !spaces) {
        return res.status(400).json({ error: "Missing fields" });
      }

      await orders.insertOne({ name, phone, lessonIDs, spaces });

      // Update lesson spaces
      for (let i = 0; i < lessonIDs.length; i++) {
        await lessons.updateOne(
          { _id: new ObjectId(lessonIDs[i]) },
          { $inc: { spaces: -spaces[i] } }
        );
      }

      res.status(201).json({ message: "Order submitted" });
    });

    // --- FIX: Prevent 404 on "/" ---
    app.get('/', (req, res) => {
      res.send("Backend API is running. Use /lessons or /orders.");
    });

    // --- Start server ---
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  } catch (err) {
    console.error(err);
  }
}

start();
