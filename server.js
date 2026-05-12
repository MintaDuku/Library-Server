import express, {json} from "express";
import connectDB from "./db.js";
import bcrypt from "bcrypt";
import cors from "cors";
import jwt from "jsonwebtoken";
// import dotenv from "dotenv"; 
import 'dotenv/config';

const SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT;
const app = express();

app.use(express.json());
app.use(cors());

// Get One-User by id
app.get("/Users/:id",async (req, res, next)=>{
    try{
        console.log("utenti");
       
        const usersCollection = db.collection("users");
        const filter = {
            _id: parseInt(req.params.id)
        };

        const users = await usersCollection.findOne(filter);
        res.json(users);

    } catch(err){ 
        next(err)
    }
});

// Get All Users
app.get("/Users", async (req, res, next)=>{ 
    try{
        console.log("Utenti");
       
        const usersCollection = db.collection("users");
        const filter = {};
        
        const users = await usersCollection.find(filter).toArray();
        
        
        res.json(users);
    } catch (err) {
        next(err);
    }
});


// Example: GET /Library?title= Sirius...
app.get("/Library",async (req, res, next) => {

    try{

        console.log("URL completa:", req.url);
        console.log("Query:", req.query);
        console.log("Title:", req.query.title);

        const libraryCollection = db.collection("books");
        
        const filter = {};

        if (req.query.title){
            const titles = req.query.title.split(","); 
            console.log("Titles ricevuti:", titles);
            filter.title = { $in : titles.map((title) => RegExp(`^${title.trim()}`,"i"))};
        }

        
        if (req.query.author){     
            const authors = req.query.author.split(","); 
            filter.author = { $in : authors.map((authors) => RegExp(`^${authors.trim()}`,"i"))};
        
        }


        // if (req.query.year){
        //     filter.year = Number(req.query.year);
        // }

        
        if (req.query.genre){
            filter.genre = RegExp(`^${req.query.genre.trim()}`, "i");
        }

        // if(Object.keys(filter).length == 0){
        //     return res.status(400).json({error: "Almeno un filtro è richiesto"});
        // }

        const library = await libraryCollection.find(filter).toArray();

        if (library.length === 0) {
            return res.status(404).json({ error: "Nessun risultato trovato" });
        }
        console.log("Filter finale:", JSON.stringify(filter));


        res.json(library);

    } catch (err){
        next(err)
    }
});

// Delete User
app.delete("/Users/:id",async (req, res, next)=>{
    try{
        console.log("Utenti delete");
       
        const usersCollection = db.collection("users");
        const filter = {
            _id: parseInt(req.params.id)
        };

        const result = await usersCollection.deleteOne(filter);
        
        res.status(201).json({
        message: "Successfully deleted one document.",
        id: result.insertedId
        });

    }catch (err) {
        if (err.code === 11000) {
        return res.status(409).json({
            error: "id doesn't exists"
        });
        }
        next(err);
    }
});

// Delete Book
app.delete("/Library/:code",async (req, res, next)=>{
    try{
        console.log("libri delete");
       
        const libraryCollection = db.collection("books");
        const filter = {
            code: parseInt(req.params.code)
        };

        const result = await libraryCollection.deleteOne(filter);
        
        res.status(200).json({message: "Successfully deleted."});

    }catch (err) {
        if (err.code === 11000) {
        return res.status(409).json({
            error: "Book doesn't exists"
        });
        }
        next(err);
    }
});

// Create User
app.post("/Users/register", async (req, res, next) => {
    try {
        console.log("Utenti crea")

        const usersCollection = db.collection("users");
      
        const hash =  await bcrypt.hash(req.body.passwd,12)
        //                                             ↑
        //                                         "salt rounds" → quanto è lento
        //                                         l'algoritmo (più alto = più sicuro)

        const newUser= {
            name: req.body.name,
            email:req.body.email,
            passwd:hash,
            admin: req.body.admin
        };
        
        const result = await usersCollection.insertOne(newUser);

        res.status(201).json({
        message: "User added",
        id: result.insertedId
        });

    } catch (err) {
        if (err.code === 11000) {
        return res.status(409).json({
            error: "Code already exists"
        });
        }
        next(err);
    }
});

// Users login
app.post("/Users/login", async (req, res, next) => {
    try {
        console.log("Utenti crea")

        const usersCollection = db.collection("users");
      

        const setValidation= {
            email:req.body.email,
            passwd:req.body.passwd
        };
 
        const filter ={
            email: setValidation.email
        }

        const user = await usersCollection.findOne(filter);
        
        if(!user) return res.status(404).json({error: 'Users not found'});

        const match = await bcrypt.compare(setValidation.passwd, user.passwd);

        if (!match) return res.status(401).json({success: match});

        // dotenv.config();

        // Genera token con dati non sensibili
        const token =  jwt.sign(
            {userId: user._id, name: user.name, email: user.email, admin: user.admin},
            SECRET,
            {expiresIn: '24h'} // scade dopo 24 ore
            
        )

        return res.status(200).json({success: match, token}); // token = token: token

    } catch (err) {

        if (err.code === 11000) {
        return res.status(409).json({
            error: "Code already exists"
        });
        }
        next(err);
        
    }
});

// Add Book
app.post("/Library", async (req, res, next) => {
    try {
        const booksCollection = db.collection("books");

        const newBook = {
            title: req.body.title,
            author: req.body.author,
            year: Number(req.body.year),
            availableCopies: Number(req.body.availableCopies),
            totalCopies: Number(req.body.totalCopies),
            code: Number(req.body.code),
            isbn: Number(req.body.isbn),
            description: req.body.description
        };

        const result = await booksCollection.insertOne(newBook);

        res.status(201).json({message: "Book added", id: result.insertedId });

    } catch (err) {
        if (err.code === 11000) {
        return res.status(409).json({
            error: "Book already exists"
        });
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

        // Se manda anche la password, la ri-hashiamo
        if (req.body.passwd) {
            update.$set.passwd = await bcrypt.hash(req.body.passwd, 12);
        }

        const result = await usersCollection.updateOne(filter, update);

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ message: "User update" });

    } catch (err) {
        next(err);
    }
});

// Change Book
app.put("/Library/:code"/*, authServer, requireAdmin*/, async (req, res, next) => {
    try {
        const libraryCollection = db.collection("books");

        const filter = { code: parseInt(req.params.code) };

        const update = {
            $set: {
                title: req.body.title,
                author: req.body.author,
                year: Number(req.body.year),
                availableCopies: Number(req.body.availableCopies),
                totalCopies: Number(req.body.totalCopies),
                isbn: Number(req.body.isbn),
                description: req.body.description
            }
        };

        const result = await libraryCollection.updateOne(filter, update);// {},{}

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Book not found" });
        }

        res.status(200).json({ message: "Book update" });

    } catch (err) {
        next(err);
    }
});


function requireAdmin(req, res, next) {
    if (!req.user.admin) {
        return res.status(403).json({ error: "Deny Access: require admin" });
    }
    next();
}


async function authServer(req,res,next){
    console.log(req.headers);

    const authHeader = req.headers.authorization;
    
    const token = req.headers.authorization?.split(" ")[1];
    // Se authorization non esiste → restituisce undefined, nessun crash

    if(!token) return res.status(401).json({error: "Token missed"});

    try{
        const decoded = jwt.verify(token, SECRET); // token validator
        req.user = decoded;  // ex: { userId: 123, email: ...}
        next();
    }catch{
        return res.status(401).json({error: "Token doesnt valid"});
    }

}

let db;
// Server start
async function startServer(){
    try{
        db = await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
    
        });
    } catch (error) {
        console.error("Failed to start server:",error);

        process.exit(1);
    }
}

startServer();


