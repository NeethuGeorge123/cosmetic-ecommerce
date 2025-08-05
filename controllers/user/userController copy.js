//const User = require("../../models/userSchema");
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
  } catch (error) {
    console.log("Home page not found");
    res.status(500).send("Server error");
  }
};

const mongoose = require('mongoose'); 

const shopNow = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const category = req.query.category;
    const brand = req.query.brand;
    const gt = parseInt(req.query.gt) || 0;
    const lt = parseInt(req.query.lt) || 0;

    const userId = req.session.user;
    const user = await User.findById(userId);

    let filter = {
      status: "Available",
      isBlocked: false
    };

    if (searchQuery) {
      filter.productName = { $regex: new RegExp(searchQuery, 'i') };
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = new mongoose.Types.ObjectId(category);
    }

    if (brand) {

      const brandData= await Brand.findById(brand)
      filter.brand = brandData.brandName; 
    }

    if (gt && lt ) {
      filter.salePrice = { $gte: gt, $lte: lt };
    } else if (gt) {
      filter.salePrice = { $gte: gt };
    } else if (lt) {
      filter.salePrice = { $lte: lt };
    }
    

    const ITEMS_PER_PAGE = 9;
    const page = parseInt(req.query.page) || 1;
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
   
    if (page > totalPages && totalPages > 0) {
      return res.redirect(`/shop?page=${totalPages}`);
    } else if (page < 1) {
      return res.redirect('/shop?page=1');
    }

    const productData = await Product.find(filter)
      .populate("category")
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    const categoryData = await Category.find({ isListed: true });
    const brandData = await Brand.find({ isBlocked: false });

    res.render('user/shoppingPage', {
      products: productData,
      category: categoryData,
      brand: brandData,
      searchQuery,
      user,
      currentPage: page,
      totalPages,
    });

  } catch (error) {
    console.error("Error in shopNow controller:", error.message);
    res.status(500).send("Server Error");
  }
};

const loadSignup = async (req, res) => {
  try {
    
    return res.render("user/signup.ejs");
  } catch (error) {
    console.error("Home page not found", error);
    res.status(500).send("Server error");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const signup = async (req, res, next) => {
  try {
     

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
  } catch (error) {
    console.error("Error during user signup:", error);
    res.redirect("user/pageNotFound");
  }
};

function generateReferralCode(input) {
  if (!input || typeof input !== "string") return null;

  const base = input.substring(0, 4).toUpperCase();

  const randomNumber = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");

  return `${base}${randomNumber}`;
}


const loadLogin = async (req, res) => {
  try {
    
    return res.render("user/login.ejs", { message: null });
  } catch (error) {
    console.error("Home page not found", error);
    res.status(500).send("Server error");
  }
};



const userLogin = async (req, res) => {
  try {
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
  } catch (error) {
    console.log("login error", error);
    res.render("login", { message: "login failed " });
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    return passwordHash;
  } catch (error) {}
};

const verifyOtp = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Error verifying OTP", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const resendOtp = async (req, res) => {
  
  try {
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
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({
      success: false,
      message: "Internal ServerError.Please try again",
    });
  }
};

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

const filterProduct = async (req, res) => {
  try {
     
    const user = req.session.user;
    const category = req.query.category;
    const brand = req.query.brand;
   

    const findCategory = category
      ? await Category.findOne({ _id: category })
      : null;
    const findBrand = brand ? await Brand.findOne({ _id: brand }) : null;
    const brands = await Brand.find({}).lean();
    let query = {
      isBlocked: false,
      quantity: { $gt: 0 },
    };

    if (findCategory) {
      query.category = findCategory._id;
    }

    if (findBrand) {
      query.brand = findBrand.brandName;
    }
    let findProducts = await Product.find(query).lean();
    findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    const categories = await Category.find({ isListed: true });
    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(findProducts.length / itemsPerPage);
    const currentProduct = findProducts.slice(startIndex, endIndex);
    let userData = null;

    if (user) {
      userData = await User.findOne({ _id: user });
      if (userData) {
        const searchEntry = {
          category: findCategory ? findCategory._id : null,
          brand: findBrand ? findBrand.brandName : null,
          searchedOn: new Date(),
        };
      }
    }

    res.render("user/shoppingPage", {
      user: userData,
      products: findProducts,
      category: categories,
      brand: brands,
      totalProducts: findProducts.length,
      currentPage,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Filter Product Error:", error);
    res.redirect("/pageNotFound");
  }
};

const filterByPrice = async (req, res) => {
  try {
    

    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const brands = await Brand.find({}).lean();
    const categories = await Category.find({ isListed: true }).lean();

    let findProducts = await Product.find({
      salePrice: { $gt: req.query.gt, $lt: req.query.lt },
      isBlocked: false,
      quantity: { $gt: 0 },
    }).lean();

  

    findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let totalPages = Math.ceil(findProducts.length / itemsPerPage);
    let endIndex = startIndex + itemsPerPage;
    const currentProduct = findProducts.slice(startIndex, endIndex);
    req.session.filteredProducts = findProducts;

    res.render("user/shoppingPage", {
      user: userData,
      products: currentProduct,
      category: categories,
      brand: brands,
      totalPages,
      currentPage,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
};

const searchProducts = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    let search = req.body.search;
  

    const brands = await Brand.find({}).lean();
    const categories = await Category.find({ isListed: true }).lean();
    const categoryIds = categories.map((category) => category._id.toString());
    let searchResult = [];

    if (
      req.session.filteredProducts &&
      req.session.filteredProducts.length > 0
    ) {
      searchResult = req.session.filteredProducts.filter((product) =>
        product.productName.toLowerCase().includes(search.toLowerCase())
      );
    } else {
      searchResult = await Product.find({
        productName: { $regex: ".*" + search + ".*", $options: "i" },
        isBlocked: false,
        quantity: { $gt: 0 },
        category: { $in: categoryIds },
      });
    }
    searchResult.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(searchResult.length / itemsPerPage);
    const currentProduct = searchResult.slice(startIndex, endIndex);

    res.render("user/shoppingPage", {
      user: userData,
      products: currentProduct,
      category: categories,
      brand: brands,
      totalPages,
      currentPage,
      count: searchResult.length,
    });
  } catch (error) {
    console.log("Error: ", error);
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
  filterProduct,
  filterByPrice,
  searchProducts,
};
