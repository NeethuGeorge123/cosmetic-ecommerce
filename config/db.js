// const mongoose=require("mongoose")
 const env = require("dotenv").config()





// const connectDB=async()=>{
//     try{

//         await mongoose.connect(process.env.MONGODB_URI)
//         console.log("DB connected")
//     }catch(error){

//         console.log("db error",error.message)
//         process.exit(1)
//     }
// }
// module.exports=connectDB;
//import mongoose from "mongoose";
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

const connectDatabase = async () => {
  try {
    const con = await mongoose.connect(process.env.MONGODB_URI, {

    //const con = await mongoose.connect(String(process.env.MONGODB_URI), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`\nMONGO DB CONNECTION IS SUCCESSFUL!: ${con.connection.host}`);
  } catch (err) {
    console.log(err);
    // process.exit(1)
  }
};

module.exports = connectDatabase;