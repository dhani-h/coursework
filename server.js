const path = require('path');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve images
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// MongoDB setup
const uri = "mongodb+srv://dhanishta:dhanishta@cluster0.egzooh2.mongodb.net/school?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function start() {
  try {
    await client.connect();
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

    // PUT update lesson
    app.put('/lessons/:id', async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      if (!updateData || Object.keys(updateData).length === 0)
        return res.status(400).json({ error: "No data provided for update" });

      await lessons.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      res.json({ message: "Lesson updated" });
    });

    app.listen(PORT, () => console.log(`Server running at port ${PORT}`));
  } catch (err) {
    console.error(err);
  }
}

start();
