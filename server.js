import express, {json} from "express";
import connectDB from "./db.js";
import bcrypt from "bcrypt";
import cors from "cors";

const PORT = 3001;
const app = express();

app.use(express.json());
app.use(cors());


// AllUsers
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



// Example: GET /stars?title= Sirius,Vega&minMagnitude=0.5
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

        
        // if (req.query.genre){
        //     filter.genre = req.query.genre;
        // }

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

app.get("/Library", async (req, res, next)=>{ 
    try{
        console.log("libri");
       
        const libraryCollection = db.collection("books");
        const filter = {};

        const library = await libraryCollection.find(filter).toArray();
        

        
        res.json(library);
    } catch (err) {
        next(err);
    }
});


app.get("/Library/:code",async (req, res, next)=>{
    try{
        console.log("libri");
       
        const libraryCollection = db.collection("books");
        const filter = {
            code: parseInt(req.params.code)
        };

        const library = await libraryCollection.findOne(filter);
        res.json(library);

    } catch(err){ 
        next(err)
    }
});

app.post("/Users", async (req, res, next) => {
    try {
        const usersCollection = db.collection("books");
      
        const hash = bcrypt.hash(req.body.passwd,12)

        const newUser= {
            name: req.body.name,
            email:req.body.email,
            passwd:hash
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

app.post("/Library/:code",async (req, res, next)=>{
    try{
        console.log("libri");
       
        const libraryCollection = db.collection("books");
        const filter = {
            code: parseInt(req.params.code)
        };

        const result = await libraryCollection.deleteOne(filter);
        
        res.status(201).json({
        message: "Successfully deleted one document.",
        id: result.insertedId
        });

    }catch (err) {
        if (err.code === 11000) {
        return res.status(409).json({
            error: "Code don't exists"
        });
        }
        next(err);
    }
});

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

        res.status(201).json({
        message: "Book added",
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

let db;

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


