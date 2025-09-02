const User=require("../models/userSignupSchema")


//const User = require("../models/userSignupSchema");

const userAuth = (req, res, next) => {
    if (!req.session?.user) {
        //console.log("🔴 No session found → redirecting to login");
        return res.redirect("/login");
    }

    User.findById(req.session.user)
        .then(data => {
            if (data && !data.isBlocked) {
                console.log("✅ User is valid:", data.email || data._id);
                return next();
            } else {
                //console.log("🔴 User is blocked or not found → destroying session");
                req.session.destroy(err => {
                    if (err) {
                        console.error("❌ Error destroying session:", err);
                        return res.status(500).send("Internal Server Error (session destroy failed)");
                    }
                    res.clearCookie("connect.sid"); // clear cookie
                    return res.redirect("/login");
                });
            }
        })
        .catch(error => {
            console.error("❌ Error in userAuth middleware:", error);
            return res.status(500).send("Internal Server Error (DB lookup failed)");
        });
};

const adminAuth=(req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next()
        }else{
            res.redirect("/admin/login")
        }
    })
    .catch(error=>{
        console.log("Error admin middleware")
        res.status(500).send("internal Server eooror")
    })
}


module.exports={
    userAuth,
    adminAuth
}