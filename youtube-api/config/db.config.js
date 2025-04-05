import mongoose from "mongoose";

export const ConnectDB = async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log("DATABASE CONNECTED")
    }
    catch(error){
            console.log((error.message))
            throw new Error("Something Went Wrong",error)
    }
}