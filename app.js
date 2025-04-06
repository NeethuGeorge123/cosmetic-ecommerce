const express=require("express")
const app=express()
const connectDatabase=require("./config/db.js")
const PORT=process.env.PORT || 3000
  const session=require("express-session")

const path=require ("path")
//const env=require("dotenv").config()
//const db=require("./config/db")
const userRouter=require("./routes/userRouter"); 
const adminRouter=require('./routes/adminRouter')
//db();
//middleware
connectDatabase();
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

// app.use((req,res,next)=>{
//     res.set('cache-control','no-store')
//     next()
// })
app.use(express.static(path.join(__dirname,"public")));
app.set("view engine","ejs")
//app.use("/public", express.static(__dirname + "/public"));

//set ejs the template engine


//app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,'views/admin')])
app.set("views", path.join(__dirname, "views"));

app.use("/",userRouter)
app.use("/admin",adminRouter)

app.use((req, res) => {
    res.status(404).render("user/page-404");
   // res.status(404).sendFile(__dirname + "/views/user/page-404.html");
});



app.listen(PORT, () => {
      console.log(`\nSERVER RUNNING ON PORT: ${PORT}`);
    });


// app.listen(process.env.PORT,()=>{
//     console.log("Server Running")
// } ) 



module.exports=app;


// app.use(cookeiParser());
// app.use(cloudinaryConfig);
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.set("view engine", "ejs");
 

// app.use("/admin", adminRouter);
// app.use("/product", productRouter);
// app.use("/", userRouter);
// app.listen(PORT, () => {
//   console.log(`\nSERVER RUNNING ON PORT: ${PORT}`);
// });