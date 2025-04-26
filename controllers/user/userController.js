//const User = require("../../models/userSchema");
const User = require("../../models/userSignupSchema");
const Category = require("../../models/categorySchema");
const Banner = require("../../models/bannerSchema");
const Brand = require("../../models/brandSchema");

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

    console.log("PRODUCT :", productData);

    const user = req.session.user;
    console.log("USER data", user);

    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    productData = productData.slice(0, 8);

    console.log("inside home g=function", req.session.user);
    if (user) {
      const userData = await User.findOne({ _id: user });
      return res.render("user/home.ejs", {
        user: userData,
        products: productData,
        banner: findBanner || [],
      });
    } else {
      return res.render("user/home.ejs", {
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

const shopNow = async (req, res) => {
  // try {
  //   const categories = await Category.find({ isListed: true });
  //   //console.log("PRODUCT :", productDetails);

  //   let productData = await Product.find({
  //     status: "Available",
  //     isBlocked: false,
  //     category: { $in: categories.map((category) => category._id) },
  //     quantity: { $gt: 0 },
  //   });

  //   console.log("PRODUCT in shopnow:", productData);

  //   const user = req.session.user;
  //   console.log("USER data",user)

  //   productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
  //   productData= productData.slice(0, 8);

  //   console.log("inside home g=function", user);
  //   if (user) {
  //     const userData = await User.findOne({ _id: user._id });
  //     return res.render("user/shoppingPage.ejs", {
  //       user: userData,
  //       products: productData,
  //     });
  //   } else {
  //     return res.render("user/shoppingPage.ejs", { user: null, products: productData });
  //     // return res.render("user/home.ejs",{user:null});
  //   }
  // } catch (error) {
  //   console.log("Home page not found");
  //   res.status(500).send("Server error");
  // }

  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.map((category) => category._id.toString());
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const products = await Product.find({
      isBlocked: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    })
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments({
      isBlocked: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    });

    const totalPages = Math.ceil(totalProducts / limit);

    const brands = await Brand.find({ isBlocked: false });
    const categoriesWithIds = categories.map((category) => ({
      _id: category._id,
      name: category.name,
    }));

    res.render("user/shoppingPage", {
      user: userData,
      products: products,
      category: categoriesWithIds,
      brand: brands,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    res.redirect("/pageerror");
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

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const signup = async (req, res, next) => {
  try {
    //  console.log("Email:", process.env.NODEMAILER_EMAIL);
    //console.log("Password:", process.env.NODEMAILER_PASSWORD ? "Loaded" : "Not Loaded");

    const { name, email, password, cpassword, phone } = req.body;

    const existEmail = await User.findOne({ email });

    if (existEmail) {
      //return res.status(400).json({ error: "User with this email already exists" });
      return res.render("user/signup", {
        message: "User with this email already exist",
      });
    }

    if (password !== cpassword) {
      //return res.status(400).json({ error: "Passwords do not match." });
      return res.render("user/signup", { message: "Password do not match" });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);
    console.log("Email status", emailSent);
    if (!emailSent) {
      return res.status(500).json({ error: "Error sending OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    req.session.userOtp = otp;
    req.session.otpCreatedAt = Date.now();
    req.session.userData = { name, phone, email, password: hashedPassword };
    console.log(req.session.userData);

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
    return res.render("user/login.ejs", { message: null });
  } catch (error) {
    console.error("Home page not found", error);
    res.status(500).send("Server error");
  }
};

// const userLogin = async (req, res) => {
//   console.log("in userLogin function")
//     const { email, password } = req.body;
//   console.log(req.body);
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ error: "Incorrect email" });
//     }
//   console.log("password from db :",user.password)
//     const isPasswordCorrect = await bcrypt.compare(password, user.password);

//     if (!isPasswordCorrect) {
//       return res.status(400).json({ error: "Incorrect password" });
//     }

//     return res.redirect("/")

//     // // res.status(200).json({
//     // //   _id:
//     // //   res.status(200).json({
//     // //     _id: user.id,
//     // //     name: user.name,
//     // //     email: user.email,
//     // //     isVerified: user.isVerified,
//     // //     //token: generateAuthToken(user._id),
//     // //   })
//     // });
// }

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    // const findUser = await User.findOne({ email, isAdmin: false, isVerified: true });

    const findUser = await User.findOne({ isAdmin: 0, email: email });
    if (!findUser) {
      return res.render("user/login", { message: "User not found" });
    }
    if (findUser.isBlocked) {
      return res.render("user/login", { message: "User id blocked by admin" });
    }

    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

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
    console.log("Entered OTP:", otp);
    console.log("Session OTP:", req.session.userOtp);

    if (!req.session.userOtp) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new OTP.",
      });
    }

    const otpCreatedAt = req.session.otpCreatedAt;

    const now = Date.now();
    if (!otpCreatedAt || now - otpCreatedAt > 30 * 1000) {
      return res
        .status(400)
        .json({
          success: false,
          message: "OTP has expired. Please request a new one.",
        });
    }

    // Convert both to strings for comparison
    if (String(otp) !== String(req.session.userOtp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // OTP matches
    const user = req.session.userData;
    //  const passwordHash = await bcrypt.hash(user.password,10);
    //for avoid already existing user before saving

    const existingUser = await User.findOne({ email: user.email });
    if (existingUser) {
      return res.json({
        success: true,
        redirectUrl: "/",
      });
    }

    const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: user.password,
    });

    await saveUserData.save();
    req.session.user = saveUserData._id;

    // Respond with JSON instead of rendering
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
  console.log("Inside of resend-otp");
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }
    console.log("inside resend otp");
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
        .json({ success: false, message: "Faileresend OTP.Please try again " });
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
    // console.log(req.query)
    const user = req.session.user;
    const category = req.query.category;
    const brand = req.query.brand;
    // const categoriesWithIds=categories.map(category=>({_id:category._id,name:category.name}));

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
    console.log("inside filterprice");

    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const brands = await Brand.find({}).lean();
    const categories = await Category.find({ isListed: true }).lean();

    let findProducts = await Product.find({
      salePrice: { $gt: req.query.gt, $lt: req.query.lt },
      isBlocked: false,
      quantity: { $gt: 0 },
    }).lean();

    console.log("Find products:", findProducts);

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
    console.log("SearchProducts:", search);

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
