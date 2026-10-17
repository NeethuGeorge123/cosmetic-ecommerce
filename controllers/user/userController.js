const mongoose = require("mongoose");
const User = require("../../models/userSignupSchema");
const Category = require("../../models/categorySchema");
const Banner = require("../../models/bannerSchema");
const Brand = require("../../models/brandSchema");
const Wallet = require("../../models/walletSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const sendVerificationEmail = require("../../util/sendVerificationEmail");
const Product = require("../../models/productSchema");
const asyncHandler = require("../../middlewares/asyncHandler");
const Wishlist = require("../../models/wishlistSchema");
const { validatePassword } = require("../../util/passwordValidator");


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
  

  let productData = await Product.find({
    status: "Available",
    isBlocked: false,
    category: { $in: categories.map((category) => category._id) },
    quantity: { $gt: 0 },
  });

  const user = req.session.user;

  productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
  productData = productData.slice(0, 9);

  
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
  //const user = await User.findById(userId);
  const user = userId ? await User.findById(userId) : null;
  let wishlistProductIds = [];
  if (userId) {
    const wishlistDoc = await Wishlist.findOne({ userId });
    if (wishlistDoc) {
      wishlistProductIds = wishlistDoc.products.map((p) =>
        p.productId.toString()
      );
    }
  }

  const search = req.query.search || "";
  const category = req.query.category || "";
  const brand = req.query.brand || "";
  const gt = Number(req.query.gt) || 0;
  const lt = Number(req.query.lt) || 0;
  const sort = req.query.sort || "";

  const ITEMS_PER_PAGE = 9;

  let filter = {
    isBlocked: false,
    quantity: { $gt: 0 },
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
    sortQuery.createdAt = -1;
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
    queryString,
    wishlistProductIds,
  });
});

const loadSignup = asyncHandler(async (req, res) => {
  return res.render("user/signup.ejs");
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const signup = asyncHandler(async (req, res, next) => {
  const { name, email, password, cpassword, phone, referral } = req.body;

  

  
  for (const [key, value] of Object.entries({ name, email, phone, password, cpassword })) {
    if (typeof value !== "string") {
      return res.status(400).json({
        success: false,
        field: key === "cpassword" ? "confirm-password" : key,
        message: "Invalid input",
      });
    }
  }
  if (referral !== undefined && typeof referral !== "string") {
    return res.status(400).json({ success: false, field: "referral", message: "Invalid referral code" });
  }

  
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();
  const cleanReferral = referral ? referral.trim() : "";

  
  if (!/^[A-Za-z\s]{2,50}$/.test(cleanName)) {
    return res.status(400).json({
      success: false, field: "name",
      message: "Name must be 2-50 letters and spaces only",
    });
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
    return res.status(400).json({
      success: false, field: "email",
      message: "Enter a valid email address",
    });
  }

  if (!/^[0-9]{10}$/.test(cleanPhone)) {
    return res.status(400).json({
      success: false, field: "phone",
      message: "Phone number must be exactly 10 digits",
    });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ success: false, field: "password", message: passwordError });
  }

  if (password !== cpassword) {
    return res.status(400).json({
      success: false, field: "confirm-password",
      message: "Passwords do not match",
    });
  }



  const existEmail = await User.findOne({ email: cleanEmail });
  if (existEmail) {
    return res.status(400).json({
      success: false, field: "email",
      message: "User with this email already exists",
    });
  }


  

  if (cleanReferral) {
    const referredUser = await User.findOne({ referralCode: cleanReferral.toUpperCase() });
    if (!referredUser) {
      return res.status(400).json({
        success: false, field: "referral",
        message: "Not a valid referral code",
      });
    }
  }

  

  const otp = generateOtp();
  const emailSent = await sendVerificationEmail(cleanEmail, otp);
  console.log("OTP", otp); 

  if (!emailSent) {
    return res.status(500).json({
      success: false, field: "email",
      message: "Error sending OTP",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  req.session.userOtp = otp;
  req.session.otpCreatedAt = Date.now();
  req.session.userData = {
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    password: hashedPassword,
    referral: cleanReferral,
  };

  return res.json({ success: true, redirect: "/verify-otp" });
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
  if (req.session.user) {
    return res.redirect("/");
  }
  const message = req.query.blocked
    ? "Your account was blocked by admin. You have been logged out."
    : null;
  return res.render("user/login.ejs", { message, email: "" });
});


const userLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return res.render("user/login", {
      message: "Email is required",
      email,
    });
  }

  if (!password || !password.trim()) {
    return res.render("user/login", {
      message: "Password is required",
      email,
    });
  }

  const findUser = await User.findOne({
    isAdmin: 0,
    email: email.trim(),
  });

  if (!findUser) {
    return res.render("user/login", { message: "User not found", email });
  }

  if (findUser.isBlocked) {
    return res.render("user/login", {
      message: "User id blocked by admin",
      email,
    });
  }

  const passwordMatch = await bcrypt.compare(password, findUser.password);

  if (!passwordMatch) {
    return res.render("user/login", {
      message: "Incorrect password",
      email,
    });
  }

  req.session.user = findUser._id;
  res.redirect("/");
});


const securePassword = asyncHandler(async (password) => {
  const passwordHash = await bcrypt.hash(password, 10);

  return passwordHash;
});

const getVerifyOtp = asyncHandler(async (req, res) => {
  if (!req.session.userOtp || !req.session.userData) {
    return res.redirect("/signup");
  }
  res.render("user/verify-otp");
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!req.session.userOtp) {
    return res.status(400).json({
      success: false,
      message: "Session expired. Please request a new OTP.",
    });
  }

  const otpCreatedAt = req.session.otpCreatedAt;

  const now = Date.now();
  if (!otpCreatedAt || now - otpCreatedAt > 60 * 1000) {
    return res.status(400).json({
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

  let referral = req.session.userData.referral;
  referral = referral.toUpperCase();
  
  let referredUser;
  
  if (referral && referral.trim()) {
      referredUser = await User.findOne({ referralCode: referral });
  }
  
  const referralCode = generateReferralCode(user.name);
  
  const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: user.password,
      referralCode,
      referredBy: referredUser?.name,
  });
  
  await saveUserData.save();
  req.session.user = saveUserData._id;
  
  if (referral && referral.trim() && referredUser) {
      
      let referrerWallet = await Wallet.findOne({ userId: referredUser._id });
      if (!referrerWallet) {
          referrerWallet = new Wallet({
              userId: referredUser._id,
              balance: 0,
              transactions: [],
          });
      }
      referrerWallet.balance += 500;
      referrerWallet.transactions.push({
          amount: 500,
          type: "credit",
          description: "Referral Reward",
      });
      await referrerWallet.save();
  
    
      referredUser.redeemedUsers.push(saveUserData._id);
      await referredUser.save();
  
    
      let newUserWallet = await Wallet.findOne({ userId: saveUserData._id });
      if (!newUserWallet) {
          newUserWallet = new Wallet({
              userId: saveUserData._id,
              balance: 0,
              transactions: [],
          });
      }
      newUserWallet.balance += 200;
      newUserWallet.transactions.push({
          amount: 200,
          type: "credit",
          description: "Referral Reward",
      });
      await newUserWallet.save();
  }
  
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
    res.status(200).json({ success: true, message: "OTP resend Successfully" });
  } else {
    res.status(500).json({
      success: false,
      message: "Failed to send OTP.Please try again ",
    });
  }
});

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        
        return res.redirect("/pageNotFound");
      }
      res.clearCookie("user_sid");
      return res.redirect("/login");
    });
  } catch (error) {
    
    res.redirect("/pageNotFound");
  }
};


const getReferrals = asyncHandler(async (req, res) => {
  const userId = req.session.user;

  const userData = await User.findById(userId).populate('redeemedUsers', 'name email createdOn');

  res.render("user/referrals", {
      user: userData,
      referralCode: userData.referralCode || null,
      redeemedUsers: userData.redeemedUsers || []
  });
});

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  loadLogin,
  userLogin,
  getVerifyOtp,
  verifyOtp,
  resendOtp,
  logout,
  shopNow,
  getReferrals
};
