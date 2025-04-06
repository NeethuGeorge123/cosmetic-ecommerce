const User=require("../models/userSignupSchema")


const userAuth=(req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect("/login")
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware")
            res.status(500).send("internal Server error")
        })
    }else{
        res.redirect("/login")
    }


}

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