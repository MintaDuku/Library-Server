import express, {json} from "express";
import connectDB from "./db.js";
import cors from "cors";

const PORT = 3001;
const app = express();

app.use(express.json());
app.use(cors());

let db;

async function startServer(){
    try{
        db = await connectDB();

        app.listen(PORT, () => {
            console.log(`Serve running on http://localhost:${PORT}`);
    
        });
    } catch (error) {
        console.error("Failed to start server:",error);

        process.exit(1);
    }
}

startServer();


// app.get("/stars", async (req, res, next)=>{ 
//     try{
//         console.log("stars!")
//         // const stars = [{name:"Ciccio"}];
//         const starsCollection = db.collection("stars");
//         const filter = {};

//         const stars = await starsCollection.find(filter).toArray();
        

//         //res.status(200).json(stars);
//         res.json(stars);
//     } catch (err) {
//         next(err);
//     }
// });