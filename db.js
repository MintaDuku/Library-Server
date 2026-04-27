import { MongoClient } from "mongodb";

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

let db;

export default async function connectDB(){
    if(!db){
        await client.connect();

        console.log("Connected to MongoDB");

        db = client.db("Library");
    }

    return db;
}