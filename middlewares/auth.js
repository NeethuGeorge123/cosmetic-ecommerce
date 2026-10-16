const User=require("../models/userSignupSchema")




const userAuth = (req, res, next) => {
    if (!req.session?.user) {
        const isAjax =
      req.xhr ||
      req.method !== "GET" ||
      req.headers.accept?.includes("application/json");

    if (isAjax) {
      return res
        .status(401)
        .json({ status: false, message: "Please login first" });
    } 
        return res.redirect("/login");
    
    }

    User.findById(req.session.user)
        .then(data => {
            if (data && !data.isBlocked) {
                
                return next();
            } else {
                
                req.session.destroy(err => {
                    if (err) {
                       
                        return res.status(500).send("Internal Server Error (session destroy failed)");
                    }
                    res.clearCookie("user_sid"); 
                    return res.redirect("/login?blocked=true");
                });
            }
        })
        .catch(error => {
            
            return res.status(500).send("Internal Server Error (DB lookup failed)");
        });
};

const adminAuth = (req, res, next) => {
    if (!req.session?.admin) {
        return res.redirect("/admin/login");
    }
    User.findById(req.session.admin)
        .then(data => {
            if (data && data.isAdmin && !data.isBlocked) {
                return next();
            } else {
                req.session.destroy(err => {
                    if (err) return res.status(500).send("Internal Server Error");
                    res.clearCookie("admin_sid");
                    return res.redirect("/admin/login");
                });
            }
        })
        .catch(() => res.status(500).send("Internal Server Error"));
};

module.exports={
    userAuth,
    adminAuth
}