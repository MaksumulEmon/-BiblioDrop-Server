const express = require('express');
const dontenv = require('dotenv')
const cors = require("cors")
const { MongoClient, ObjectId, ServerApiVersion, } = require('mongodb');
dontenv.config()

const uri = process.env.MONGODB_URI
const app = express()
const port = process.env.PORT

app.use(cors());
app.use(express.json())

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



async function run() {
    try {
        await client.connect();

        const db = client.db("bibliodrop")
        const bookCollection = db.collection("books");


        // Librain all book
        app.get("/librarian/books", async (req, res) => {
            const result = await bookCollection.find().toArray();
            res.json(result);
        });


        // Manage invertry
        app.get("/librarian/my-books/:userId", async (req, res) => {
            const { userId } = req.params;

            const result = await bookCollection.find({
                userId: userId
            }).toArray();

            res.send(result);
        });




        //  Single librain book
        app.get("/librarian/:id", async (req, res) => {
            const { id } = req.params;

            const result = await bookCollection.findOne({
                _id: new ObjectId(id)
            });

            res.json(result);
        });


        // Edit Modal
        app.patch("/librarian/:id", async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;

            const result = await bookCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: updatedData
                }
            );

            res.send(result);
        });

        // Delete  Rooom
        app.delete("/librarian/:id", async (req, res) => {
            const { id } = req.params;

            const result = await bookCollection.deleteOne({
                _id: new ObjectId(id)
            });

            res.json(result);
        });




        // FeaturedBook
        app.get('/featured', async (req, res) => {
            const result = await bookCollection
                .find()
                .sort({ _id: -1 })
                .limit(6)
                .toArray();

            res.send(result);
        });


        // Librain Add book
        app.post("/librarian/books", async (req, res) => {
            const books = req.body;
            const result = await bookCollection.insertOne(books);
            res.send(result);
        });


        // Status  InventoryTableMange
        app.patch("/librarian/book/status/:id", async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;

            const result = await bookCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status } }
            );

            res.send(result);
        });






        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Server Runing on port ${port}`)
})