const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static images directly
app.use(express.static(path.join(__dirname, '../images')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// MongoDB setup
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

    // POST new order
    app.post('/orders', async (req, res) => {
      const { name, phone, lessonIDs, spaces } = req.body;
      if (!name || !phone || !lessonIDs || !spaces) {
        return res.status(400).json({ error: "Missing order fields" });
      }

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
    });

    // Catch-all for SPA routing (optional)
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../index.html'));
    });

    // Start server
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

start();
