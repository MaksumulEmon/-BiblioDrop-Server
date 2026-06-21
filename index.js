const express = require('express');
const dontenv = require('dotenv')
const cors = require("cors")
const { MongoClient, ObjectId, ServerApiVersion, } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
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

const JKWS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

const verifyToken = async (req, res, next) => {
    const authheader = req.headers.authorization;

    console.log(authheader)

    if (!authheader || !authheader.startsWith("Bearer")) {
        return res.status(401).json({ msg: "Unauthorized1" });
    }

    const token = authheader.split(" ")[1]
    if (!token) {
        return res.status(401).json({ msg: "Unauthorized2" });
    }

    try {
        const { payload } = await jwtVerify(token, JKWS)
        // console.log(payload)
        req.user = payload
        next()
    } catch (error) {
        console.log(error)
        return res.status(401).json({ msg: "Unauthorized3" });
    }
}



const librainVerify = async (req, res, next) => {
    const user = req.user;
    // console.log("user from Librain", user)

    if (user.role !== "librarian") {
        return res.status(403).json({ msg: "Forbidden" });
    }
    next()
}




async function run() {
    try {
        await client.connect();

        const db = client.db("bibliodrop")
        const bookCollection = db.collection("books");


        // Librain all book
        // app.get("/librarian/books", async (req, res) => {
        //     const result = await bookCollection.find().toArray();
        //     res.json(result);
        // });


        app.get("/librarian/books", async (req, res) => {
            const result = await bookCollection
                .find()
                .sort({ _id: -1 })
                .toArray();

            res.json(result);
        });

        app.get("/librarian/books", async (req, res) => {
            const { userId } = req.query;

            const result = await bookCollection.find({
                userId: userId,
                status: "published"
            }).toArray();

            res.json(result);
        });


        app.get("/librarian/books", async (req, res) => {
            const { userId } = req.query;

            const result = await bookCollection.find({
                userId: userId
            }).toArray();

            res.send(result);
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
        app.post("/librarian/books", verifyToken, librainVerify, async (req, res) => {
            const token = req.query.token
            console.log(token)
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



        app.get("/admin/pending-books", async (req, res) => {
            try {
                const result = await bookCollection.find({
                    status: "pending"
                }).toArray();

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Server Error" });
            }
        });


        app.patch("/admin/book/approve/:id", async (req, res) => {
            try {
                const { id } = req.params;

                const result = await bookCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            status: "published",
                            approvedAt: new Date()
                        }
                    }
                );

                res.send(result);

            } catch (error) {
                res.status(500).send({ message: "Approve failed" });
            }
        });




        app.delete("/admin/book/:id", async (req, res) => {
            try {
                const { id } = req.params;

                const result = await bookCollection.deleteOne({
                    _id: new ObjectId(id)
                });

                res.send(result);

            } catch (error) {
                res.status(500).send({ message: "Delete failed" });
            }
        });



        app.get("/admin/books", async (req, res) => {
            try {
                const result = await bookCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch books" });
            }
        });



        app.get("/books", async (req, res) => {
            try {
                const result = await bookCollection.find({
                    status: "published"
                }).toArray();

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed" });
            }
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