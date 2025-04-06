//const User = require("../../models/userSchema");
const User = require("../../models/userSignupSchema");
const env=require("dotenv").config()
const nodemailer=require("nodemailer")
const bcrypt=require("bcrypt")
const sendVerificationEmail=require("../../util/sendVerificationEmail")
const pageNotFound = async (req, res) => {
  try {
    res.render("user/page-404");
  } catch (error) {
    //res.redirect("/pageNotfound")
    res.status(500).send("Error loading the 404 page");
  }
};

const loadHomepage = async (req, res) => {
  try {
    return res.render("user/home.ejs");
  } catch (error) {
    console.log("Home page not found");
    res.status(500).send("Server error");
  }
};

const loadSignup = async (req, res) => {
  try {
    console.log("signup page okkkk");
    return res.render("user/signup.ejs");
  } catch (error) {
    console.error("Home page not found", error);
    res.status(500).send("Server error");
  }
};

function generateOtp(){
  return Math.floor(100000+Math.random()*900000).toString();
}

const signup = async (req, res,next) => {

  try {

    console.log("Email:", process.env.NODEMAILER_EMAIL);
console.log("Password:", process.env.NODEMAILER_PASSWORD ? "Loaded" : "Not Loaded");

    const { name, email, password, cpassword, phone } = req.body;

    const existEmail = await User.findOne({ email });

    if (existEmail) {
      //return res.status(400).json({ error: "User with this email already exists" });
    return res.render("user/signup",{message:"User with this email already exist"});
    }
     
    if (password !== cpassword) {
      //return res.status(400).json({ error: "Passwords do not match." });
    return res.render("user/signup",{message:"Password do not match"});
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);
    console.log("Email status",emailSent)
    if (!emailSent) {
      return res.status(500).json({ error: "Error sending OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    req.session.userOtp = otp;
    req.session.userData = { name,phone,email, password: hashedPassword };
    console.log(req.session.userData)

    res.render("user/verify-otp.ejs");
    console.log("OTP Sent", otp);
  } catch (error) {
    console.error("Error during user signup:", error);
    res.redirect("user/pageNotFound");
  }
};

 

const loadLogin = async (req, res) => {
  try {
    console.log("Login page okkkk");
    return res.render("user/login.ejs",{ error: null });
  } catch (error) {
    console.error("Home page not found", error);
    res.status(500).send("Server error");
  }
};

const userLogin = async (req, res) => {
    const { email, password } = req.body;
  console.log(req.body);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Incorrect email" });
    }
  
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Incorrect password" });
    }
  
    return res.redirect("/")
    
  
    res.status(200).json({
      _id:
      res.status(200).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        //token: generateAuthToken(user._id),
      })
    });
}

const securePassword=async(password)=>{
  try {
    const passwordHash=await bcrypt.hash(password,10)

    return passwordHash;

  } catch (error) {
    
  }
}


const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("Entered OTP:", otp);
    console.log("Session OTP:", req.session.userOtp);
    
    if (!req.session.userOtp) {
      return res.status(400).json({ 
        success: false, 
        message: "Session expired. Please request a new OTP." 
      });
    }
    
    // Convert both to strings for comparison
    if (String(otp) !== String(req.session.userOtp)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP. Please try again." 
      });
    }
    
    // OTP matches
    const user = req.session.userData;
    const passwordHash = await securePassword(user.password);
    const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: passwordHash, 
    });
    
    await saveUserData.save();
    req.session.user = saveUserData._id;
    
    // Respond with JSON instead of rendering
    return res.json({
      success: true,
      redirectUrl: "/"
    });
    
  } catch (error) {
    console.error("Error verifying OTP", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}


// const verifyOtp=async (req,res)=>{
//   console.log("REQUEST BODY DATA",req.body)
//   try {
    
// const {otp}=req.body;
// console.log("Entered OTP:", otp);
// console.log(typeof(otp)+"OTP TYPE ENTERED");
//         console.log("Session OTP:", req.session.userOtp);
//         console.log(req.session)
// //console.log(otp);
// if (!req.session.userOtp) {
//   return res.status(400).json({ success: false, message: "Session expired. Please request a new OTP." });
// }

// if (otp !== req.session.userOtp) {
//   return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
// }

// console.log("session otp type",typeof(req.session.userOtp))

// if(otp===req.session.userOtp){
//   console.log("OTP Checking if")
//   const user=req.session.userData 
//   const passwordHash=await securePassword(user.password)


//   const saveUserData=new User({
//     name:user.name,
//     email:user.email,
//     phone:user.phone,
//     password:passwordHash, 
//   })
//   await saveUserData.save()
//   req.session.user=saveUserData._id;
//   res.render("/")
//   // res.json({success:true,redirectUrl:"/"})
// }

//   } catch (error) {
//     console.error("Error verifing OTP",error)
//     res.status(500).json({success:false,message:"server error"})
//   }
// }

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  loadLogin,
  userLogin,
  verifyOtp,
};
