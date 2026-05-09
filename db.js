import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
const uri = process.env.DB_URL;
const client = new MongoClient(uri);

let db;

export default async function connectDB(){
    if(!db){
        await client.connect();

        console.log("Connected to MongoDB");

        db = client.db(process.env.DB_NAME);
    }

    return db;
}