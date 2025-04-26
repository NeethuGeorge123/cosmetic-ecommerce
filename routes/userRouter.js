const express=require("express")
const router=express.Router();
const userController=require("../controllers/user/userController");
const passport = require("passport");
const profileController=require("../controllers/user/profileController");
const productController=require("../controllers/user/productController")
const { userAuth } = require("../middlewares/auth");


router.get("/pageNotFound",userController.pageNotFound)
router.get("/",userController.loadHomepage)
router.get("/shopnow",userAuth,userController.shopNow)
router.get("/filter",userAuth,userController.filterProduct)
router.get("/filterPrice",userAuth,userController.filterByPrice)
router.post("/search",userAuth,userController.searchProducts);






router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)


router.get("/login",userController.loadLogin)
router.post("/login",userController.userLogin)


router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp);

router.get("/logout",userController.logout)

 router.get("/forgot-password",profileController.getForgotPassPage)
 router.post("/forgot-email-valid",profileController.forgotEmailValid)
 router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage);
router.post("/resend-forgot-otp",profileController.resendOtp)
router.post("/reset-password",profileController.postNewPassword)

//product management

router.get("/productDetails",userAuth,productController.productDetails)


router.get('/auth/google',passport.authenticate("google",{scope:['profile','email']}));



router.get("/auth/google/callback",
    passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
        console.log("🟡 /auth/google hit!");
        res.redirect('/')
});





module.exports=router;