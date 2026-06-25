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

const adminVerify = async (req, res, next) => {
    const user = req.user;
    if (user.role !== "admin") {
        return res.status(403).json({ msg: "Forbidden" });
    }
    next()
}





async function run() {
    try {
        // await client.connect();

        const db = client.db("bibliodrop")
        const bookCollection = db.collection("books");
        const paymentCollection = db.collection("payments");
        const deliveryCollection = db.collection("deliveries");
        const reviewCollection = db.collection("reviews");
        const userCollection = db.collection("user");


        // Librain all book
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

            const result = await bookCollection
                .find({
                    userId: userId
                })
                .sort({ _id: -1 })
                .toArray();

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
                .find({ status: "published" })
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
            books.status = "pending"; // Enforce status pending
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



        // This jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj

        app.get("/admin/books", async (req, res) => {
            try {
                const result = await bookCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch books" });
            }
        });

        // All books showw         -------------------------------------------

        app.get("/books", async (req, res) => {
            const { page = 1, limit = 10, search = "", category = "", minFee = "", maxFee = "", availability = "", } = req.query;

            const skip = (Number(page) - 1) * Number(limit);
            const query = {
                status: "published",
            };

            // Search By Name
            if (search) {
                query.title = {
                    $regex: search,
                    $options: "i",
                };
            }

            // Category Filter
            if (category) {
                query.category = category;
            }

            // Delivery Fee Filter
            if (minFee || maxFee) {
                query.deliveryFee = {};

                if (minFee) {
                    query.deliveryFee.$gte = Number(minFee);
                }

                if (maxFee) {
                    query.deliveryFee.$lte = Number(maxFee);
                }
            }

            // Availability Filter
            if (availability) {
                query.availability = availability;
                // example: available / unavailable
            }

            const result = await bookCollection
                .find(query)
                .sort({ _id: -1 })
                .skip(skip)
                .limit(Number(limit))
                .toArray();

            const totalData = await bookCollection.countDocuments(query);

            const totalPage = Math.ceil(
                totalData / Number(limit)
            );

            res.send({
                data: result,
                page: Number(page),
                totalPage,
            });
        });




        // app.get("/books", async (req, res) => {
        //     const { page = 1, limit = 10 } = req.query;
        //     const skip = (Number(page) - 1) * Number(limit)
        //     const result = await bookCollection.find({ status: "published" }).skip(skip).limit(Number(limit)).sort({ _id: -1 }).toArray();

        //     const totalData = await bookCollection.countDocuments({ status: "published" })
        //     const totalPage = Math.ceil(totalData / Number(limit))
        //     res.send({ data:result, page: Number(page), totalPage });

        // });



        // app.get("/books", async (req, res) => {
        //     const {page=1,limit=10} = req.query;
        //     const skip = (Number(page) -1) * Number(limit)
        //     try {
        //         const result = await bookCollection.find({
        //             status: "published"
        //         })
        //         .sort({ _id: -1 })
        //         .toArray();

        //         res.send(result);
        //     } catch (error) {
        //         res.status(500).send({ message: "Failed" });
        //     }
        // });


        // ==========================================
        // EXTENDED BIBLIODROP API ENDPOINTS
        // ==========================================

        // 1. Payment Success & Auto-create Delivery
        app.post("/api/payments/confirm", async (req, res) => {
            const { transactionId, userId, userEmail, userName, bookId, amount, address } = req.body;

            if (!transactionId || !userId || !bookId) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            try {
                // Prevent duplicate processing
                const existing = await paymentCollection.findOne({ transactionId });
                if (existing) {
                    return res.json({ success: true, payment: existing, msg: "Already processed" });
                }

                // Get book details to enrich librarian info
                const book = await bookCollection.findOne({ _id: new ObjectId(bookId) });
                if (!book) {
                    return res.status(404).json({ error: "Book not found" });
                }

                const paymentDoc = {
                    transactionId,
                    userId,
                    userEmail,
                    userName: userName || "Reader",
                    bookId: new ObjectId(bookId),
                    bookTitle: book.title,
                    amount: Number(amount),
                    date: new Date(),
                    librarianId: book.userId,
                    librarianEmail: book.userEmail,
                    librarianName: book.userName
                };

                const paymentResult = await paymentCollection.insertOne(paymentDoc);

                // Auto-create delivery record
                const deliveryDoc = {
                    paymentId: paymentResult.insertedId,
                    transactionId,
                    userId,
                    userEmail,
                    userName: userName || "Reader",
                    bookId: new ObjectId(bookId),
                    bookTitle: book.title,
                    bookImage: book.image,
                    librarianId: book.userId,
                    librarianEmail: book.userEmail,
                    deliveryFee: Number(amount),
                    status: "pending", // pending -> dispatched -> delivered
                    address: address || "Not provided",
                    date: new Date()
                };

                const deliveryResult = await deliveryCollection.insertOne(deliveryDoc);

                res.json({
                    success: true,
                    paymentId: paymentResult.insertedId,
                    deliveryId: deliveryResult.insertedId
                });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Failed to confirm payment" });
            }
        });

        // 2. User (Reader) Dashboard APIs
        app.get("/api/deliveries/user", verifyToken, async (req, res) => {
            try {
                const userId = req.user.id;
                const result = await deliveryCollection.find({ userId }).sort({ date: -1 }).toArray();
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch deliveries" });
            }
        });

        app.get("/api/payments/user", verifyToken, async (req, res) => {
            try {
                const userId = req.user.id;
                const result = await paymentCollection.find({ userId }).sort({ date: -1 }).toArray();
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch payments" });
            }
        });

        app.get("/api/reviews/user", verifyToken, async (req, res) => {
            try {
                const userId = req.user.id;
                const result = await reviewCollection.find({ userId }).sort({ date: -1 }).toArray();
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch reviews" });
            }
        });





        app.get("/reviews/book/:id", async (req, res) => {

            const id = req.params.id;

            const reviews = await reviewCollection
                .find({
                    bookId: new ObjectId(id)
                })
                .sort({ date: -1 })
                .toArray();

            res.send(reviews);
        });



        app.post("/api/reviews", verifyToken, async (req, res) => {
            const { bookId, rating, comment } = req.body;
            const userId = req.user.id;

            if (!bookId || !rating || !comment) {
                return res.status(400).json({ error: "Missing review fields" });
            }

            try {
                // Verify delivery
                const delivery = await deliveryCollection.findOne({
                    userId,
                    bookId: new ObjectId(bookId),
                    status: "delivered"
                });

                if (!delivery) {
                    return res.status(403).json({ error: "You can only review books that have been delivered to you." });
                }

                const book = await bookCollection.findOne({ _id: new ObjectId(bookId) });
                if (!book) {
                    return res.status(404).json({ error: "Book not found" });
                }

                const reviewDoc = {
                    bookId: new ObjectId(bookId),
                    bookTitle: book.title,
                    userId,
                    userEmail: req.user.email,
                    userName: req.user.name,
                    rating: Number(rating),
                    comment,
                    date: new Date()
                };

                const result = await reviewCollection.insertOne(reviewDoc);
                res.json({ success: true, result });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Failed to add review" });
            }
        });

        app.patch("/api/reviews/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const { rating, comment } = req.body;
            const userId = req.user.id;

            try {
                const filter = { _id: new ObjectId(id), userId };
                const update = {
                    $set: {
                        rating: Number(rating),
                        comment,
                        updatedAt: new Date()
                    }
                };
                const result = await reviewCollection.updateOne(filter, update);
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to update review" });
            }
        });

        app.delete("/api/reviews/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const userId = req.user.id;

            try {
                const result = await reviewCollection.deleteOne({ _id: new ObjectId(id), userId });
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to delete review" });
            }
        });

        // 3. Librarian Dashboard APIs
        app.post("/api/books", verifyToken, librainVerify, async (req, res) => {
            try {
                const book = req.body;
                book.status = "pending"; // default
                book.createdAt = new Date();
                book.updatedAt = new Date();
                const result = await bookCollection.insertOne(book);
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to create book" });
            }
        });

        app.get("/api/books/librarian", verifyToken, librainVerify, async (req, res) => {
            try {
                const userId = req.user.id;
                const result = await bookCollection.find({ userId }).sort({ _id: -1 }).toArray();
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch librarian books" });
            }
        });

        app.get("/api/deliveries/librarian", verifyToken, librainVerify, async (req, res) => {
            try {
                const librarianId = req.user.id;
                const result = await deliveryCollection.find({ librarianId }).sort({ date: -1 }).toArray();
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch librarian deliveries" });
            }
        });

        app.patch("/api/deliveries/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;

            if (req.user.role !== "librarian" && req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden" });
            }

            try {
                const filter = { _id: new ObjectId(id) };
                if (req.user.role === "librarian") {
                    filter.librarianId = req.user.id;
                }

                const result = await deliveryCollection.updateOne(filter, {
                    $set: { status, updatedAt: new Date() }
                });
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to update delivery" });
            }
        });

        app.get("/api/payments/librarian", verifyToken, librainVerify, async (req, res) => {
            try {
                const librarianId = req.user.id;
                const payments = await paymentCollection.find({ librarianId }).sort({ date: -1 }).toArray();
                const deliveries = await deliveryCollection.find({ librarianId }).toArray();
                res.json({ payments, deliveries });
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch librarian earnings" });
            }
        });

        // 4. Admin Dashboard APIs
        app.get("/api/users", verifyToken, adminVerify, async (req, res) => {
            try {
                const result = await userCollection.find().toArray();
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch users" });
            }
        });

        app.patch("/api/users/role/:id", verifyToken, adminVerify, async (req, res) => {
            const { id } = req.params;
            const { role } = req.body;

            try {
                let result = await userCollection.updateOne(
                    { _id: id },
                    { $set: { role, updatedAt: new Date() } }
                );

                if (result.matchedCount === 0) {
                    result = await userCollection.updateOne(
                        { _id: new ObjectId(id) },
                        { $set: { role, updatedAt: new Date() } }
                    );
                }

                res.json({ success: true, result });
            } catch (err) {
                res.status(500).json({ error: "Failed to update role" });
            }
        });

        app.patch("/api/users/block/:id", verifyToken, adminVerify, async (req, res) => {
            const { id } = req.params;
            const { isBlocked } = req.body;

            try {
                let result = await userCollection.updateOne(
                    { _id: id },
                    { $set: { isBlocked: !!isBlocked, banned: !!isBlocked, updatedAt: new Date() } }
                );

                if (result.matchedCount === 0) {
                    result = await userCollection.updateOne(
                        { _id: new ObjectId(id) },
                        { $set: { isBlocked: !!isBlocked, banned: !!isBlocked, updatedAt: new Date() } }
                    );
                }

                res.json({ success: true, result });
            } catch (err) {
                res.status(500).json({ error: "Failed to block user" });
            }
        });

        app.delete("/api/users/:id", verifyToken, adminVerify, async (req, res) => {
            const { id } = req.params;

            try {
                let result = await userCollection.deleteOne({ _id: id });
                if (result.deletedCount === 0) {
                    result = await userCollection.deleteOne({ _id: new ObjectId(id) });
                }
                res.json({ success: true, result });
            } catch (err) {
                res.status(500).json({ error: "Failed to delete user" });
            }
        });

        app.get("/api/books/pending", verifyToken, adminVerify, async (req, res) => {
            try {
                const result = await bookCollection.find({ status: "pending" }).toArray();
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch pending books" });
            }
        });

        app.patch("/api/books/approve/:id", verifyToken, adminVerify, async (req, res) => {
            const { id } = req.params;
            const { action } = req.body; // approve / reject

            try {
                const status = action === "reject" ? "rejected" : "published";
                const result = await bookCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status, approvedAt: new Date() } }
                );
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: "Failed to approve/reject book" });
            }
        });

        app.get("/api/payments/admin", verifyToken, adminVerify, async (req, res) => {
            try {
                const payments = await paymentCollection.find().sort({ date: -1 }).toArray();
                const deliveries = await deliveryCollection.find().toArray();
                const usersCount = await userCollection.countDocuments();
                const booksCount = await bookCollection.countDocuments();
                res.json({ payments, deliveries, usersCount, booksCount });
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch admin stats" });
            }
        });




        // await client.db("admin").command({ ping: 1 });
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