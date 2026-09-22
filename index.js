const express = require('express');
const dontenv = require('dotenv')
const cors = require("cors")
const { MongoClient, ObjectId, ServerApiVersion, } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
dontenv.config()

const uri = process.env.MONGODB_URI
const app = express()
const port = process.env.PORT || 5000
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

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
                const numConditions = {};
                const strConditions = {};

                if (minFee) {
                    numConditions.$gte = Number(minFee);
                    strConditions.$gte = String(Number(minFee));
                }

                if (maxFee) {
                    numConditions.$lte = Number(maxFee);
                    strConditions.$lte = String(Number(maxFee));
                }

                query.$or = [
                    { deliveryFee: numConditions },
                    { deliveryFee: strConditions }
                ];
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

        app.get("/payments/check/:bookId/:userId", async (req, res) => {

            const { bookId, userId } = req.params;

            const payment = await paymentCollection.findOne({
                bookId: new ObjectId(bookId),
                userId
            });

            res.send({
                purchased: !!payment
            });
        });




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

        // 5. AI BiblioBot Recommendation Endpoint
        app.post("/api/ai/recommend", async (req, res) => {
            const { message, history } = req.body;

            if (!message || typeof message !== "string") {
                return res.status(400).json({ error: "Message is required" });
            }

            try {
                // Fetch published books from MongoDB for ground-truth catalog context
                const publishedBooks = await bookCollection
                    .find({ status: "published" })
                    .project({
                        title: 1,
                        author: 1,
                        category: 1,
                        deliveryFee: 1,
                        description: 1,
                        image: 1
                    })
                    .limit(30)
                    .toArray();

                if (!publishedBooks.length) {
                    return res.json({
                        reply: "Our library shelves are currently being updated! Please check back shortly for available books.",
                        books: [],
                        suggestedFollowUps: ["Check back later", "Browse all categories"]
                    });
                }

                const catalogSummary = publishedBooks.map(b => ({
                    id: b._id.toString(),
                    title: b.title,
                    author: b.author || "Unknown",
                    category: b.category || "General",
                    deliveryFee: b.deliveryFee || 0,
                    description: (b.description || "").slice(0, 160)
                }));

                let replyText = "";
                let recommendedIds = [];
                let followUps = [];

                if (genAI && process.env.GEMINI_API_KEY) {
                    try {
                        const model = genAI.getGenerativeModel({
                            model: "gemini-1.5-flash",
                            generationConfig: {
                                temperature: 0.7,
                            }
                        });

                        const prompt = `You are "BiblioBot", a warm, witty, and knowledgeable AI book concierge and assistant for Bibliodrop, an online book delivery platform.
Your identity: Your name is BiblioBot! You help readers discover books, answer questions about yourself, explain how Bibliodrop works (delivering books right to readers' doorsteps), and suggest titles based on mood, interests, or budget.

CURRENT AVAILABLE CATALOG IN BIBLIODROP:
${JSON.stringify(catalogSummary, null, 2)}

User request: "${message}"

INSTRUCTIONS:
1. If the user asks general or conversational questions (e.g., "what is your name?", "who are you?", "hi", "how are you?", "what can you do?"):
   - Directly and warmly answer their question (e.g. introduce yourself as BiblioBot, the Bibliodrop reading concierge).
   - "recommendedBookIds" can be an empty array [] or include 1-2 featured books if you want to invite them to read.
2. If the user asks for books, recommendations, genres, moods, authors, or delivery pricing/ranges:
   - If a delivery range or limit is mentioned (e.g., 'delivery range 2 to 6', 'between $2 and $5', 'under $5 fee'), prioritize and filter books whose deliveryFee fits within that range, and clearly state their delivery fees in the reply.
   - Recommend 1 to 3 best matching books from the catalog above.
   - Explain why in 2-3 friendly sentences.
3. Return your answer as a raw JSON object ONLY (no markdown outside JSON):
{
  "reply": "Your friendly, conversational response answering their question directly.",
  "recommendedBookIds": ["id1", "id2"],
  "suggestedFollowUps": ["Quick suggestion 1", "Quick suggestion 2", "Quick suggestion 3"]
}`;

                        const result = await model.generateContent(prompt);
                        const rawText = result.response.text().trim();

                        // Clean potential markdown code fences ```json ... ```
                        const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
                        const parsed = JSON.parse(cleaned);

                        replyText = parsed.reply || "";
                        recommendedIds = Array.isArray(parsed.recommendedBookIds) ? parsed.recommendedBookIds : [];
                        followUps = Array.isArray(parsed.suggestedFollowUps) ? parsed.suggestedFollowUps : [];
                    } catch (aiErr) {
                        console.warn("Gemini API call note (using fallback):", aiErr.message);
                    }
                }

                // Fallback heuristic if AI did not return a response
                if (!replyText) {
                    const queryLower = message.toLowerCase();

                    // 1. Check conversational / identity intents
                    if (queryLower.includes("your name") || queryLower.includes("who are you")) {
                        replyText = "I'm BiblioBot, your personal AI library concierge at Bibliodrop! I can help you discover books by mood, genre, author, or find titles within any delivery fee range.";
                        recommendedIds = [];
                        followUps = [
                            "Show books under $5 delivery",
                            "Recommend an exciting fiction book",
                            "Books between $2 and $6 delivery"
                        ];
                    } else if (queryLower.includes("hello") || queryLower.includes("hi") || queryLower.includes("hey")) {
                        replyText = "Hello! I'm BiblioBot, your reading guide. What kind of book or delivery fee range are you looking for today?";
                        recommendedIds = publishedBooks.slice(0, 2).map(b => b._id.toString());
                        followUps = [
                            "Recommend a quick read",
                            "Show books under $5 delivery",
                            "Suggest popular books"
                        ];
                    } else {
                        // 2. Check for delivery fee range patterns like "between 2 and 6", "range 1 to 5", "under 5", etc.
                        let minFeeReq = null;
                        let maxFeeReq = null;

                        const rangeMatch = queryLower.match(/(?:between|range|from)?\s*\$?(\d+(?:\.\d+)?)\s*(?:to|-|and)\s*\$?(\d+(?:\.\d+)?)/i);
                        const underMatch = queryLower.match(/(?:under|below|less than|max)\s*\$?(\d+(?:\.\d+)?)/i);
                        const feeWord = queryLower.includes("fee") || queryLower.includes("delivery") || queryLower.includes("cheap");

                        if (rangeMatch) {
                            minFeeReq = Number(rangeMatch[1]);
                            maxFeeReq = Number(rangeMatch[2]);
                        } else if (underMatch) {
                            minFeeReq = 0;
                            maxFeeReq = Number(underMatch[1]);
                        } else if (feeWord && queryLower.includes("cheap")) {
                            minFeeReq = 0;
                            maxFeeReq = 5;
                        }

                        let rangeBooks = [];
                        if (minFeeReq !== null || maxFeeReq !== null) {
                            rangeBooks = publishedBooks.filter(b => {
                                const fee = Number(b.deliveryFee || 0);
                                const matchMin = minFeeReq !== null ? fee >= minFeeReq : true;
                                const matchMax = maxFeeReq !== null ? fee <= maxFeeReq : true;
                                return matchMin && matchMax;
                            });
                        }

                        const matchedByQuery = publishedBooks.filter(b => {
                            const titleMatch = b.title && queryLower.includes(b.title.toLowerCase());
                            const catMatch = b.category && queryLower.includes(b.category.toLowerCase());
                            const authorMatch = b.author && queryLower.includes(b.author.toLowerCase());
                            const descMatch = b.description && b.description.toLowerCase().split(/\s+/).some(w => w.length > 3 && queryLower.includes(w));
                            return titleMatch || catMatch || authorMatch || descMatch;
                        });

                        if (rangeBooks.length > 0) {
                            const combined = rangeBooks.filter(b => matchedByQuery.includes(b));
                            const selected = combined.length > 0 ? combined.slice(0, 3) : rangeBooks.slice(0, 3);
                            recommendedIds = selected.map(b => b._id.toString());
                            replyText = `I found these books with delivery fees in your requested range ($${minFeeReq ?? 0} - $${maxFeeReq ?? "any"}):`;
                            followUps = [
                                "Show lowest delivery fee books",
                                "Fiction books in this range",
                                "Browse all categories"
                            ];
                        } else if (matchedByQuery.length > 0) {
                            const selected = matchedByQuery.slice(0, 3);
                            recommendedIds = selected.map(b => b._id.toString());
                            replyText = "I found these fantastic books from our collection that match your search:";
                            followUps = [
                                "Show books with lowest delivery fee",
                                "Recommend an exciting fiction read",
                                "Show academic & science books"
                            ];
                        } else {
                            const selected = publishedBooks.slice(0, 2);
                            recommendedIds = selected.map(b => b._id.toString());
                            replyText = "Here are some popular, highly-recommended books currently available for delivery on Bibliodrop:";
                            followUps = [
                                "Books under $5 delivery",
                                "Recommend a mystery novel",
                                "Tell me what's popular"
                            ];
                        }
                    }
                }

                // Attach full book objects for the matched IDs
                const matchedBooks = publishedBooks.filter(b => recommendedIds.includes(b._id.toString()));

                res.json({
                    reply: replyText,
                    books: matchedBooks,
                    suggestedFollowUps: followUps.length > 0 ? followUps : [
                        "Fiction books under $5",
                        "Tell me what's popular",
                        "Books for learning"
                    ]
                });
            } catch (err) {
                console.error("BiblioBot recommend error:", err);
                res.status(500).json({ error: "Failed to process recommendation" });
            }
        });

        // 6. Multimodal AI Book Scanner ("Snap & Catalog")
        app.post("/api/ai/scan-book", async (req, res) => {
            const { imageBase64, mimeType, fileName } = req.body;

            if (!imageBase64) {
                return res.status(400).json({ error: "Image data (base64) is required" });
            }

            // Strip prefix e.g. "data:image/jpeg;base64," if present
            const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9]+;base64,/i, "");
            const effectiveMime = mimeType || "image/jpeg";

            // Helper for fallback title inference from filename
            const getInferredFallback = (fname) => {
                let cleanTitle = "Scanned Library Book";
                let cleanAuthor = "Editorial Team";
                let cleanCategory = "Fiction";
                let fee = 3;

                if (fname) {
                    const baseName = fname.replace(/\.[^/.]+$/, "").replace(/[_\-\.]+/g, " ").trim();
                    if (baseName.length > 2) {
                        cleanTitle = baseName.replace(/\b\w/g, c => c.toUpperCase());
                    }
                    const lower = fname.toLowerCase();
                    if (lower.includes("habit") || lower.includes("clear")) {
                        cleanTitle = "Atomic Habits";
                        cleanAuthor = "James Clear";
                        cleanCategory = "Academic";
                        fee = 4;
                    } else if (lower.includes("sapiens") || lower.includes("harari")) {
                        cleanTitle = "Sapiens: A Brief History of Humankind";
                        cleanAuthor = "Yuval Noah Harari";
                        cleanCategory = "History";
                        fee = 4;
                    } else if (lower.includes("clean code") || lower.includes("martin")) {
                        cleanTitle = "Clean Code";
                        cleanAuthor = "Robert C. Martin";
                        cleanCategory = "Academic";
                        fee = 4;
                    } else if (lower.includes("gatsby") || lower.includes("fitzgerald")) {
                        cleanTitle = "The Great Gatsby";
                        cleanAuthor = "F. Scott Fitzgerald";
                        cleanCategory = "Fiction";
                        fee = 3;
                    } else if (lower.includes("science") || lower.includes("physics") || lower.includes("bio")) {
                        cleanCategory = "Science";
                    }
                }

                return {
                    title: cleanTitle,
                    author: cleanAuthor,
                    category: cleanCategory,
                    deliveryFee: fee,
                    description: `A thoughtfully selected ${cleanCategory} volume titled "${cleanTitle}". This edition offers readers an engaging perspective, valuable knowledge, and an immersive reading journey. Ready for prompt doorstep delivery via Bibliodrop.`,
                    tags: [cleanCategory, "ScannedEdition", "FeaturedReading"]
                };
            };

            // Attempt Gemini Multimodal Vision first
            if (genAI && process.env.GEMINI_API_KEY) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: "gemini-1.5-flash",
                        generationConfig: {
                            temperature: 0.2,
                        }
                    });

                    const imagePart = {
                        inlineData: {
                            data: cleanBase64,
                            mimeType: effectiveMime
                        }
                    };

                    const prompt = `You are an expert library archivist and book cataloging specialist for Bibliodrop.
Examine this book cover or title page image carefully.

Extract and infer the following metadata:
1. title: The exact title of the book visible on the cover or inferred from the design.
2. author: The author(s) or writer(s) of the book.
3. category: Choose the single best fit strictly from: ["Fiction", "Academic", "Science", "Biography", "History"].
4. deliveryFee: Suggested delivery fee number between 2 and 6 (e.g. 3 or 4 based on standard book delivery).
5. description: A compelling, well-written, 2-3 paragraph professional synopsis and reading appeal suitable for a modern library book catalog.
6. tags: 3 to 5 relevant topic or theme keywords.

Return your response as a raw JSON object ONLY adhering to this exact schema (NO extra markdown formatting outside JSON):
{
  "title": "string",
  "author": "string",
  "category": "Fiction | Academic | Science | Biography | History",
  "deliveryFee": 3,
  "description": "string",
  "tags": ["tag1", "tag2"]
}`;

                    const result = await model.generateContent([prompt, imagePart]);
                    const rawText = result.response.text().trim();

                    // Robust JSON extraction using regex
                    let parsed = null;
                    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            parsed = JSON.parse(jsonMatch[0]);
                        } catch (pErr) {
                            console.warn("Regex match JSON parse failed, trying fence clean:", pErr);
                        }
                    }

                    if (!parsed) {
                        const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
                        parsed = JSON.parse(cleaned);
                    }

                    // Enforce valid category
                    const allowedCategories = ["Fiction", "Academic", "Science", "Biography", "History"];
                    const finalCategory = allowedCategories.includes(parsed.category) ? parsed.category : "Fiction";

                    return res.json({
                        success: true,
                        book: {
                            title: parsed.title || "",
                            author: parsed.author || "",
                            category: finalCategory,
                            deliveryFee: Number(parsed.deliveryFee) || 3,
                            description: parsed.description || "",
                            tags: Array.isArray(parsed.tags) ? parsed.tags : []
                        }
                    });
                } catch (geminiErr) {
                    console.warn("Gemini Multimodal Vision API warning (using intelligent catalog fallback):", geminiErr.message);
                }
            }

            // Resilient catalog fallback if Gemini API is unreachable or key invalid
            const fallbackBook = getInferredFallback(fileName);
            return res.json({
                success: true,
                book: fallbackBook,
                notice: "Metadata extracted with catalog archivist heuristics."
            });
        });

        // In-memory cache for book X-Ray to ensure fast responses
        const xrayCache = new Map();

        // 7. AI Book X-Ray (Reading metrics, key takeaways, voice teaser script)
        app.get("/api/ai/book-xray/:id", async (req, res) => {
            const { id } = req.params;

            if (xrayCache.has(id)) {
                return res.json({ success: true, xray: xrayCache.get(id) });
            }

            try {
                let book = null;
                try {
                    book = await bookCollection.findOne({ _id: new ObjectId(id) });
                } catch (e) {
                    return res.status(400).json({ error: "Invalid book ID" });
                }

                if (!book) {
                    return res.status(404).json({ error: "Book not found" });
                }

                if (!genAI || !process.env.GEMINI_API_KEY) {
                    const fallbackXray = {
                        readingLevel: "Intermediate",
                        readingTime: "5 - 7 Hours",
                        targetAudience: "Curious readers passionate about " + (book.category || "great literature"),
                        keyTakeaways: [
                            "Deep exploration of core themes in " + (book.category || "this subject"),
                            "Engaging storytelling and practical insights",
                            "High retention value for lifelong learners"
                        ],
                        moodTags: [book.category || "Inspiring", "Engaging", "Informative"],
                        audioScript: `Welcome to the quick audio preview of ${book.title}, written by ${book.author}. Categorized under ${book.category}, this book offers a compelling journey. ${book.description ? book.description.slice(0, 180) + '...' : 'Available now for convenient home delivery through Bibliodrop.'}`
                    };
                    return res.json({ success: true, xray: fallbackXray });
                }

                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    generationConfig: {
                        temperature: 0.3,
                    }
                });

                const prompt = `You are a master literary critic and book intelligence analyst for Bibliodrop.
Analyze the following book and produce a structured "Book X-Ray" dossier.

Book Title: "${book.title}"
Author: "${book.author}"
Category: "${book.category}"
Description/Synopsis: "${book.description || 'No description provided.'}"

Return your response as raw JSON ONLY with this exact schema (NO Markdown outside JSON):
{
  "readingLevel": "Beginner | Intermediate | Advanced",
  "readingTime": "e.g. 4 - 6 Hours",
  "targetAudience": "A concise sentence describing who will enjoy or benefit most from reading this",
  "keyTakeaways": [
    "First crucial insight or premise (1-2 sentences)",
    "Second crucial insight or narrative highlight (1-2 sentences)",
    "Third crucial practical or emotional takeaway (1-2 sentences)"
  ],
  "moodTags": ["3 to 4 short vibe keywords, e.g. Thought-Provoking, Fast-Paced, Inspiring"],
  "audioScript": "A captivating, conversational 60-second narrator script (110-140 words) that hooks the listener, explains what makes this book unique, and invites them to order delivery. Must sound natural when spoken aloud by text-to-speech."
}`;

                const result = await model.generateContent(prompt);
                const rawText = result.response.text().trim();
                const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
                const parsed = JSON.parse(cleaned);

                xrayCache.set(id, parsed);

                res.json({ success: true, xray: parsed });
            } catch (err) {
                console.error("Book X-Ray error:", err);
                res.status(500).json({ error: "Failed to generate Book X-Ray: " + err.message });
            }
        });

        // 8. Interactive "Ask This Book" Q&A
        app.post("/api/ai/book-qa/:id", async (req, res) => {
            const { id } = req.params;
            const { question } = req.body;

            if (!question || !question.trim()) {
                return res.status(400).json({ error: "Question is required" });
            }

            try {
                let book = null;
                try {
                    book = await bookCollection.findOne({ _id: new ObjectId(id) });
                } catch (e) {
                    return res.status(400).json({ error: "Invalid book ID" });
                }

                if (!book) {
                    return res.status(404).json({ error: "Book not found" });
                }

                if (!genAI || !process.env.GEMINI_API_KEY) {
                    return res.json({
                        success: true,
                        answer: `"${book.title}" by ${book.author} is a prominent ${book.category} title on Bibliodrop. It is well-regarded for its content and is available for delivery right now!`
                    });
                }

                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    generationConfig: {
                        temperature: 0.4,
                    }
                });

                const prompt = `You are the knowledgeable book concierge for Bibliodrop.
A reader is looking at the book details page and considering whether to order delivery for this book.
They have asked this question:
"${question}"

Book Context:
Title: "${book.title}"
Author: "${book.author}"
Category: "${book.category}"
Description: "${book.description || 'Not provided'}"

Instructions:
1. Answer the question directly, honestly, and engagingly in 2 to 3 concise sentences.
2. Ground your answer in the book's subject matter, genre, and likely target audience.
3. Help the borrower make an informed decision on whether to request delivery.`;

                const result = await model.generateContent(prompt);
                const answer = result.response.text().trim();

                res.json({ success: true, answer });
            } catch (err) {
                console.error("Book QA error:", err);
                res.status(500).json({ error: "Failed to answer book question: " + err.message });
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