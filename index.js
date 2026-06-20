const express = require('express');
const dontenv = require('dotenv')
const cors = require("cors")
const { MongoClient, ServerApiVersion } = require('mongodb');
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


        // Show All book
        app.get("/librarian/books", async (req, res) => {
            const result = await bookCollection.find().toArray();
            res.send(result);
        });

        // Librain Add book
        app.post("/librarian/books", async (req, res) => {
            const books = req.body;
            const result = await bookCollection.insertOne(books);
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