const User=require("../../models/userSignupSchema");
const mongoose=require("mongoose");
const bcrypt=require("bcrypt")

const pageerror=async(req,res)=>{
    res.render("admin/admin-error")
}


const loadLogin=(req,res)=>{
    console.log("admin innnn")
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin/admin-login.ejs",{message:null})
}

// const login=async (req,res)=>{
//     try {
//         const {email,password}=req.body;
//        // const saltRounds = 10;
// //const hashedPassword = await bcrypt.hash(password, saltRounds);

//         console.log("🟢 Login request received");
//         console.log("Email:", email, "| Password:", password);
//         const admin=await User.findOne({email,isAdmin:true})
//         console.log("Admin found:", admin ? true : false);
//         if(admin){
//             const passwordMatch=await bcrypt.compare(hashedPassword.trim(),admin.password.trim());
//             console.log("Password match:", passwordMatch);
//             console.log("Entered Password:", hashedPassword);
//             console.log("Entered Password:", admin.password);
// console.log("Stored Hashed Password:", admin.password);

//             if(passwordMatch){ 

//                 req.session.admin=true;
//                 console.log("Session set:", req.session.admin);
//                 return res.redirect("/admin/dashboard")
//             }else{
//                 return res.redirect("/admin/login")
//             }

//         }else{
//             return res.redirect("/admin/login")
//         }
   
//     } catch (error) {
//         console.log("login error")
//         return res.redirect("/pageerror")
        
//     }
// };
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("🟢 Login request received");
        console.log("Email:", email, "| Password:", password);

        // Find admin user
        const admin = await User.findOne({ email, isAdmin: true });

        console.log("Admin found:", admin ? true : false);

        if (!admin) {
            //console.log("❌ Admin not found");
            return res.redirect("/admin/login");
        }

        // Compare entered password with stored hash
        const passwordMatch =  bcrypt.compare(password, admin.password);

        console.log("Password match:", passwordMatch);

        if (!passwordMatch) {
            console.log("❌ Incorrect password");
            return res.redirect("/admin/login");
        }

        // If password matches, create session
        req.session.admin = true;
        console.log("✅ Admin session created:", req.session.admin);

        return res.redirect("/admin/dashboard");
    } catch (error) {
        console.log("Login Error:", error);  // Show actual error
        return res.redirect("/pageerror");
    }
//     const bcrypt = require("bcrypt");

// const storedHash = "$2b$10$lNX/dcF5flPVNPcI7G0Lx.zcgH8aUlSYllmiEEUJcN20LepCPbtry"; // Your stored hash
// const enteredPassword = "Admin@123"; // Your input password

// bcrypt.compare(enteredPassword, storedHash)
//   .then(match => console.log("Password match:", match))
//   .catch(err => console.error("Error:", err));

};


const loadDashboard=async (req,res)=>{
    console.log(" Dashboard route hit");
    if(req.session.admin){
        try {
            console.log("✅ Admin session verified. Rendering dashboard.");
            res.render("admin/dashboard.ejs")
        } catch (error) {
            
        console.log("🔒 No admin session, redirecting to login");
            res.redirect("/admin/login")
        }
    } 
 

}

const logout=async(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error distroying session",err);
                    return res.redirect("/pageerror")
                
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        
        console.log("unexpected error during logout",error)
        res.redirect("/pageerror");
    }
}


module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout
}