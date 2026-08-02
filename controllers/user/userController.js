
const mongoose = require('mongoose'); 
const User = require("../../models/userSignupSchema");
const Category = require("../../models/categorySchema");
const Banner = require("../../models/bannerSchema");
const Brand = require("../../models/brandSchema");
const Wallet=require("../../models/walletSchema")
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const sendVerificationEmail = require("../../util/sendVerificationEmail");
const Product = require("../../models/productSchema");
const asyncHandler = require("../../middlewares/asyncHandler");

const pageNotFound = asyncHandler(async (req, res) => {

    res.render("user/page-404");
  
});

const loadHomepage = asyncHandler(async (req, res) => {
  
    const brands = await Brand.find({ isBlocked: false });
    const today = new Date().toISOString();
    const findBanner = await Banner.find({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) },
    });
    const categories = await Category.find({ isListed: true });
    //console.log("PRODUCT :", productDetails);

    let productData = await Product.find({
      status: "Available",
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    });

    

    const user = req.session.user;
    

    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    productData = productData.slice(0, 9);

    //console.log("inside home g=function", req.session.user);
    if (user) {
      const userData = await User.findOne({ _id: user });
      return res.render("user/home.ejs", {
        brands,
        user: userData,
        products: productData,
        banner: findBanner || [],
      });
    } else {
      return res.render("user/home.ejs", {
        brands,
        user: null,
        products: productData,
        banner: findBanner || [],
      });
      // return res.render("user/home.ejs",{user:null});
    }
  
});
 


const shopNow = asyncHandler(async (req, res) => {

  const userId = req.session.user;
  const user = await User.findById(userId);

  
  const search = req.query.search || "";
  const category = req.query.category || "";
  const brand = req.query.brand || "";
  const gt = Number(req.query.gt) || 0;
  const lt = Number(req.query.lt) || 0;
  const sort = req.query.sort || "";

  const ITEMS_PER_PAGE = 9;

  let filter = {
    isBlocked: false,
    quantity: { $gt: 0 }
  };

  
  if (search) {
    filter.productName = { $regex: search, $options: "i" };
  }

  
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    filter.category = category;
  }

  
  if (brand && mongoose.Types.ObjectId.isValid(brand)) {
    const brandData = await Brand.findById(brand);
    if (brandData) {
      filter.brand = brandData.brandName;
    }
  }

  
  if (gt && lt) {
    filter.salePrice = { $gte: gt, $lte: lt };
  } else if (gt) {
    filter.salePrice = { $gte: gt };
  } else if (lt) {
    filter.salePrice = { $lte: lt };
  }

  
  let sortQuery = {};
  if (sort === "lowToHigh") {
    sortQuery.salePrice = 1;
  } else if (sort === "highToLow") {
    sortQuery.salePrice = -1;
  } else {
    sortQuery.createdOn = -1;
  }

  
  const totalProducts = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  let page = Number(req.query.page);
  if (!page || page < 1) page = 1;
  if (page > totalPages && totalPages > 0) page = totalPages;

  const products = await Product.find(filter)
    .populate("category")
    .sort(sortQuery)
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE);

  
  const categories = await Category.find({ isListed: true });
  const brands = await Brand.find({ isBlocked: false });

  
  const params = new URLSearchParams(req.query);
  params.delete("page");
  const queryString = params.toString();

  
  res.render("user/shoppingPage", {
    user,
    products,
    category: categories,
    brand: brands,
    currentPage: page,
    totalPages,
    filters: req.query,
    queryString
  });
});

 


const loadSignup = asyncHandler(async (req, res) => {
  
    
    return res.render("user/signup.ejs");
  
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const signup = asyncHandler(async (req, res, next) => {
  
      

    const { name, email, password, cpassword, phone,referral } = req.body;

    const existEmail = await User.findOne({ email });

    if (existEmail) {
    
      return res.render("user/signup", {
        message: "User with this email already exist",
      });
    }
     

    if (password !== cpassword) {
      
      return res.render("user/signup", { message: "Password do not match" });
    }

    if (referral && referral.trim()) {
      const referralCode = referral.toUpperCase();
      const referredUser = await User.findOne({ referralCode: referralCode });
      if (!referredUser) {
        req.flash("error", "Not a Valid Refferal Code");
        return res.redirect("/signup");
      }
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);
    console.log("OTP",otp)
    
    if (!emailSent) {
      return res.status(500).json({ error: "Error sending OTP" });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    req.session.userOtp = otp;
    req.session.otpCreatedAt = Date.now();
    req.session.userData = { name, phone, email, password: hashedPassword ,referral};
    //console.log(req.session.userData);

    res.render("user/verify-otp.ejs");
    console.log("OTP Sent", otp);
  
});

function generateReferralCode(input) {
  if (!input || typeof input !== "string") return null;

  const base = input.substring(0, 4).toUpperCase();

  const randomNumber = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");

  return `${base}${randomNumber}`;
}


const loadLogin = asyncHandler(async (req, res) => {
  
    if(req.session.user){
     return res.redirect("/")
    }
    return res.render("user/login.ejs", { message: null });
 
});



const userLogin = asyncHandler(async (req, res) => {
  
    const { email, password } = req.body;
    
    const findUser = await User.findOne({ isAdmin: 0, email: email });
    if (!findUser) {
      return res.render("user/login", { message: "User not found" });
    }
    if (findUser.isBlocked) {
      return res.render("user/login", { message: "User id blocked by admin" });
    }

   

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("user/login", { message: "Incorrect password" });
    }

    req.session.user = findUser._id;
    res.redirect("/");
  
});

const securePassword =asyncHandler(async (password) => {
  
    const passwordHash = await bcrypt.hash(password, 10);

    return passwordHash;
  
});

const verifyOtp = asyncHandler(async (req, res) => {
  
    const { otp } = req.body;
    //console.log("Entered OTP:", otp);
    

    if (!req.session.userOtp) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new OTP.",
      });
    }

    const otpCreatedAt = req.session.otpCreatedAt;

    const now = Date.now();
    if (!otpCreatedAt || now - otpCreatedAt > 60 * 1000) {
      return res
        .status(400)
        .json({
          success: false,
          message: "OTP has expired. Please request a new one.",
        });
    }

    
    if (String(otp) !== String(req.session.userOtp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    
    const user = req.session.userData;
    const existingUser = await User.findOne({ email: user.email });
    if (existingUser) {
      return res.json({
        success: true,
        redirectUrl: "/",
      });
    }


    let referral=req.session.userData.referral;

    referral=referral.toUpperCase();

    let referredUser;

    if(referral && referral.trim()){
      referredUser=await User.findOne({referralCode:referral})
    
    
    let wallet=await Wallet.findOne({userId:referredUser._id})
    if(!wallet){
      wallet=new Wallet({
        userId:referredUser._id,
        balance:0,
        transactions:[],

      });
    }

    wallet.balance+=500;

    wallet.transactions.push({
      amount:500,
      type:"credit",
      description:"Referral Reward"
    });
    await wallet.save();
  }

  const referralCode=generateReferralCode(user.name)

    
    const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: user.password,
      referralCode,
      referredBy:referredUser?.name,
    });

    await saveUserData.save();
    req.session.user = saveUserData._id;
    if(referral && referral.trim()){
      let wallet=await Wallet.findOne({userId:saveUserData._id})
      if(!wallet){
        wallet=new Wallet({
          userId:saveUserData._id,
          balance:0,
          transactions:[],
        })
      }
      wallet.balance+=200;

      wallet.transactions.push({
        amount:200,
        type:"credit",
        description:"Refferal Reward",
      })
      await wallet.save();
    }

    req.session.user=saveUserData;
    return res.json({
      success: true,
      redirectUrl: "/",
    });
  
});

const resendOtp = asyncHandler(async (req, res) => {
  
  
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }
    
    const otp = generateOtp();
    req.session.userOtp = otp;
    req.session.otpCreatedAt = Date.now();

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP:", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP resend Successfully" });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Failed to send OTP.Please try again " });
    }
  
});

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destructure error");
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};



module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  loadLogin,
  userLogin,
  verifyOtp,
  resendOtp,
  logout,
  shopNow,
  
  
  
};
