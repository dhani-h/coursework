// backend/server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS (optional, helps with local dev)
app.use(cors());

// Parse JSON bodies for POST/PUT requests
app.use(express.json());

// Serve images from coursework/images
app.use('/images', express.static(path.join(__dirname, '../images')));

// Serve index.html at the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

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
      try {
        const data = await lessons.find({}).toArray();
        res.json(data);
      } catch (err) {
        console.error("Error fetching lessons:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // POST a new order
    app.post('/orders', async (req, res) => {
      const { name, phone, lessonIDs, spaces } = req.body;

      if (!name || !phone || !lessonIDs || !spaces) {
        return res.status(400).json({ error: "Missing order fields" });
      }

      try {
        const order = { name, phone, lessonIDs, spaces };
        const result = await orders.insertOne(order);

        // Update lesson spaces
        for (let i = 0; i < lessonIDs.length; i++) {
          await lessons.updateOne(
            { _id: new ObjectId(lessonIDs[i]) },
            { $inc: { spaces: -spaces[i] } }
          );
        }

        res.status(201).json({ message: "Order submitted", orderId: result.insertedId });
      } catch (err) {
        console.error("Error submitting order:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // PUT: update lesson attributes
    app.put('/lessons/:id', async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;

      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No data provided for update" });
      }

      try {
        await lessons.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        res.json({ message: "Lesson updated" });
      } catch (err) {
        console.error("Error updating lesson:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT} or Render port`);
    });

  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

// Start everything
start();
