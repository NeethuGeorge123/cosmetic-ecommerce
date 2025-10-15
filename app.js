const express=require("express")
const app=express()
const connectDatabase=require("./config/db.js")
const PORT=process.env.PORT || 3000
  const session=require("express-session")
const passport=require("./config/passport")
const path=require ("path")
const nocache=require("nocache")
const flash=require("connect-flash")
//const env=require("dotenv").config()
//const db=require("./config/db")
const userRouter=require("./routes/userRouter"); 
const adminRouter=require('./routes/adminRouter')
const errorHandler=require("./middlewares/errorHandler")
//db();
//middleware
connectDatabase();
app.use(nocache());
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
app.use(flash())
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
  });
app.use(passport.initialize());
app.use(passport.session());
app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})  
app.use(express.static(path.join(__dirname,"public")));
app.set("view engine","ejs")

app.set("views", path.join(__dirname, "views"));

app.use("/",userRouter)
app.use("/admin",adminRouter)

app.use((req, res) => {
    res.status(404).render("user/page-404");
   // res.status(404).sendFile(__dirname + "/views/user/page-404.html");
});
app.use(errorHandler)


app.listen(PORT, () => {
      console.log(`\nSERVER RUNNING ON PORT: ${PORT}`);
    });






module.exports=app;


