
 const env = require("dotenv").config()

const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

const connectDatabase = async () => {
  try {
    const con = await mongoose.connect(process.env.MONGODB_URI, {

   
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



