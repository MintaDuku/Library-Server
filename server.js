import express, {json} from "express";
import connectDB from "./db.js";
import bcrypt from "bcrypt";
import cors from "cors";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import 'dotenv/config';

const SECRET = process.env.JWT_SECRET ?? "SECRET";
const PORT = process.env.PORT ?? 3000;
const REFRESH = process.env.REFRESH_TOKEN ?? "REFRESH";
const EXP_ACCESS_TTL = process.env.EXP_ACCESS_TTL ?? "30m";
const EXP_REFRESH_TTL = process.env.EXP_REFRESH_TTL ?? "30d";

const refreshTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    createdAT: { type: Date, default: Date.now, expires: EXP_REFRESH_TTL } // TTL automatico
});

const RefreshToken = mongoose.model("refreshTokens", refreshTokenSchema);
const app = express();
app.use(express.json());
app.use(cors());

// Get One-User by id
app.get("/Users/:id", async (req, res, next) => {
    try {
        console.log("utenti");
        const usersCollection = db.collection("users");
        const filter = { _id: parseInt(req.params.id) };
        const users = await usersCollection.findOne(filter);
        res.json(users);
    } catch (err) {
        next(err);
    }
});

// Get All Users
app.get("/Users", async (req, res, next) => {
    try {
        console.log("Utenti");
        const usersCollection = db.collection("users");
        const users = await usersCollection.find({}).toArray();
        res.json(users);
    } catch (err) {
        next(err);
    }
});

// Example: GET /Library?title=Sirius...
app.get("/Library", async (req, res, next) => {
    try {
        console.log("URL completa:", req.url);
        console.log("Query:", req.query);
        console.log("Title:", req.query.title);

        const libraryCollection = db.collection("books");
        const filter = {};

        if (req.query.title) {
            const titles = req.query.title.split(",");
            console.log("Titles ricevuti:", titles);
            filter.title = { $in: titles.map((title) => RegExp(`^${title.trim()}`, "i")) };
        }

        if (req.query.author) {
            const authors = req.query.author.split(",");
            filter.author = { $in: authors.map((author) => RegExp(`^${author.trim()}`, "i")) };
        }

        if (req.query.genre) {
            filter.genre = RegExp(`^${req.query.genre.trim()}`, "i");
        }

        const library = await libraryCollection.find(filter).toArray();

        if (library.length === 0) {
            return res.status(404).json({ error: "Nessun risultato trovato" });
        }

        console.log("Filter finale:", JSON.stringify(filter));
        res.json(library);
    } catch (err) {
        next(err);
    }
});

// Delete User
app.delete("/Users/:id", async (req, res, next) => {
    try {
        console.log("Utenti delete");
        const usersCollection = db.collection("users");
        const filter = { _id: parseInt(req.params.id) };
        const result = await usersCollection.deleteOne(filter);
        res.status(200).json({ message: "Successfully deleted one document." });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "id doesn't exists" });
        }
        next(err);
    }
});

// Delete Book
app.delete("/Library/:code", async (req, res, next) => {
    console.log("delete book");
    try {
        const codeToDelete = parseInt(req.params.code);
        if (isNaN(codeToDelete)) {
            return res.status(400).json({ error: "Invalid code format" });
        }
        const libraryCollection = db.collection("books");
        await libraryCollection.deleteOne({ code: codeToDelete });
        res.status(200).json({ message: "Successfully deleted." });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "Book doesn't exists" });
        }
        next(err);
    }
});

// Create User
app.post("/Users/register", async (req, res, next) => {
    try {
        console.log("Utenti crea");
        const usersCollection = db.collection("users");
        const hash = await bcrypt.hash(req.body.passwd, 12);

        const newUser = {
            name: req.body.name,
            email: req.body.email,
            passwd: hash,
            admin: req.body.admin
        };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).json({ message: "User added", id: result.insertedId });
    } catch (err) {
        if (err.code === 11000) {
            if (err.keyPattern.email) {
                return res.status(409).json({ error: "Mail already in use" });
            }
            if (err.keyPattern.code) {
                return res.status(409).json({ error: "Code already in use" });
            }
        }
        next(err);
    }
});

// Users login
app.post("/Users/login", async (req, res, next) => {
    try {
        console.log("Utenti login");
        const usersCollection = db.collection("users");
        const { email, passwd } = req.body;
        const user = await usersCollection.findOne({ email });

        if (!user) return res.status(404).json({ error: "User not found" });

        const match = await bcrypt.compare(passwd, user.passwd);
        if (!match) return res.status(401).json({ success: false, error: "Wrong password" });

        
        const token = await genAccessToken(user);
        const refreshToken = await genRefreshToken(user);
        await issueRefreshToken(user, refreshToken);

        return res.status(200).json({ success: true, token, refreshToken });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "Code already exists" });
        }
        next(err);
    }
});

// refreshAccessToken
app.post("/Users/refresh", async (req, res) => {
    await refreshAccessToken(req, res);
});

// Logout / revoke refresh token
app.post("/Users/logout", async (req, res) => {
    await revokeRefreshToken(req, res);
});

// Add Book
app.post("/Library", async (req, res, next) => {
    if (!req.body.title || !req.body.author || !req.body.code || !req.body.isbn) {
        return res.status(400).json({ error: "Titolo, autore, codice e isbn sono obbligatori" });
    }
    if (isNaN(Number(req.body.code))) {
        return res.status(400).json({ error: "Codice invalido" });
    }
    try {
        const booksCollection = db.collection("books");
        const newBook = {
            title: req.body.title,
            author: req.body.author,
            year: Number(req.body.year),
            code: Number(req.body.code),
            isbn: Number(req.body.isbn),
            description: req.body.description
        };
        const result = await booksCollection.insertOne(newBook);
        res.status(201).json({ message: "Book added", id: result.insertedId });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "A book with this code already exists" });
        }
        next(err);
    }
});

// Change User
app.put("/Users/:id", /*authServer, requireAdmin,*/ async (req, res, next) => {
    try {
        const usersCollection = db.collection("users");
        const filter = { _id: parseInt(req.params.id) };
        const update = {
            $set: {
                name: req.body.name,
                email: req.body.email,
                admin: req.body.admin
            }
        };
        if (req.body.passwd) {
            update.$set.passwd = await bcrypt.hash(req.body.passwd, 12);
        }
        const result = await usersCollection.updateOne(filter, update);
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json({ message: "User updated" });
    } catch (err) {
        next(err);
    }
});

// Change Book
app.put("/Library/:code", /*authServer, requireAdmin,*/ async (req, res, next) => {
    try {
        const libraryCollection = db.collection("books");
        const filter = { code: parseInt(req.params.code) };
        const setFields = {};
        if (req.body.title !== undefined) { setFields.title = req.body.title; }
        if (req.body.author !== undefined) { setFields.author = req.body.author; }
        if (req.body.year !== undefined) { setFields.year = Number(req.body.year); }
        if (req.body.isbn !== undefined) { setFields.isbn = Number(req.body.isbn); }
        if (req.body.description !== undefined) { setFields.description = req.body.description; }
        const update = { $set: setFields };
        const result = await libraryCollection.updateOne(filter, update);
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Book not found" });
        }
        res.status(200).json({ message: "Book updated" });
    } catch (err) {
        next(err);
    }
});


// Middleware 

function requireAdmin(req, res, next) {
    if (!req.user.admin) {
        return res.status(403).json({ error: "Deny Access: require admin" });
    }
    next();
}

async function authServer(req, res, next) {
    console.log(req.headers);
    const authHeader = req.headers?.authorization;
    const token = authHeader?.startsWith("Bearer") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ error: "Token missed" });
    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: "Token not valid" });
    }
}



async function genAccessToken(user) {
    return jwt.sign(
        { userId: user._id, name: user.name, email: user.email, admin: user.admin },
        SECRET,
        { expiresIn: EXP_ACCESS_TTL }
    );
}


async function genRefreshToken(user) {
    return jwt.sign(
        { userId: user._id },
        REFRESH,
        { expiresIn: EXP_REFRESH_TTL }
    );
}

async function issueRefreshToken(user, refreshToken) {
    await RefreshToken.create({ token: refreshToken, userId: user._id });
}


async function refreshAccessToken(req, res) {
    const { refreshToken } = req.body;

    if (!refreshToken)
        return res.status(401).json({ error: "Missing refresh token" });

    const saved = await RefreshToken.findOne({ token: refreshToken });

    if (!saved)
        return res.status(403).json({ error: "Invalid refresh token" });

    try {
        const decoded = jwt.verify(refreshToken, REFRESH);
        const newAccessToken = await genAccessToken({ _id: decoded.userId });
        res.json({ token: newAccessToken });
    } catch {
        await RefreshToken.deleteOne({ token: refreshToken });
        return res.status(403).json({ error: "Expired refresh token" });
    }
}


async function revokeRefreshToken(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res.status(401).json({ error: "Missing refresh token" });
    await RefreshToken.deleteOne({ token: refreshToken });
    return res.json({ message: "Logged out" });
}


// ─── Start ────────────────────────────────────────────────────────────────────

let db;
async function startServer() {
    try {
        db = await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();