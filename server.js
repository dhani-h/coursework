// backend/server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Serve static files (index.html + images folder)
app.use(express.static(path.join(__dirname, '..')));

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

    // GET all lessons
    app.get('/lessons', async (req, res) => {
      const data = await lessons.find({}).toArray();
      res.json(data);
    });

    // POST a new order
    app.post('/orders', async (req, res) => {
      const { name, phone, lessonIDs, spaces } = req.body;
      if (!name || !phone || !lessonIDs || !spaces) {
        return res.status(400).json({ error: "Missing order fields" });
      }

      await orders.insertOne({ name, phone, lessonIDs, spaces });

      // Update spaces for each lesson
      for (let i = 0; i < lessonIDs.length; i++) {
        await lessons.updateOne(
          { _id: new ObjectId(lessonIDs[i]) },
          { $inc: { spaces: -spaces[i] } }
        );
      }

      res.status(201).json({ message: "Order submitted" });
    });

    // Catch-all route for frontend
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../index.html'));
    });

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

start();
