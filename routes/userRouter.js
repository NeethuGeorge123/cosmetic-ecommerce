const express=require("express")
const router=express.Router();
const userController=require("../controllers/user/userController");
const passport = require("passport");
const profileController=require("../controllers/user/profileController");
const productController=require("../controllers/user/productController")
const cartController=require("../controllers/user/cartController")
const orderController=require("../controllers/user/orderController")
const wishlistController=require("../controllers/user/wishlistController")
const walletController=require("../controllers/user/walletController")
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
router.get("/userProfile",userAuth,profileController.userProfile)

router.get("/my-profile",userAuth,profileController.getMyProfile)



router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid)
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp);
router.post("/update-email",userAuth,profileController.updateEmail)
router.get("/change-password",userAuth,profileController.changePassword)
router.post("/change-password",userAuth,profileController.changePasswordValid)
router.post("/verify-changepassword-otp",userAuth,profileController.verifyChangePassOtp)
//address management

router.get("/myAddress",userAuth,profileController.getMyAddress )

router.get("/addAddress",userAuth,profileController.addAddress)
router.post("/addAddress",userAuth,profileController.postAddAddress)
router.get("/editAddress",userAuth,profileController.editAddress)
router.post("/editAddress",userAuth,profileController.postEditAddress)
router.get("/deleteAddress",userAuth,profileController.deleteAddress)
//product management

router.get("/productDetails",userAuth,productController.productDetails)



//Cart

router.post("/cart",userAuth,cartController.addToCart)
router.get("/cart",userAuth,cartController.getCart)
// router.get("/cart/count", userAuth, cartController.getCartCount);
router.put("/cart",userAuth,cartController.updateCartQuantity)
router.delete("/cart",userAuth,cartController.deleteFromCart)


//checkout
router.get("/checkout",userAuth,cartController.getCheckout)
router.post("/applyCoupon",userAuth,orderController.applyCoupon)
router.delete("/removeCoupon",userAuth,orderController.removeCoupon)

//orders

// router.get("/myOrders",userAuth,orderController.orders)
router.post("/placeOrder",userAuth,orderController.placeOrder)
router.get("/confirmation",userAuth,orderController.orderConfirmation)
router.get("/orders",userAuth,orderController.getOrders)
router.post("/orderSearch",userAuth,orderController.searchOrder)
router.get("/viewOrderDetails",userAuth,orderController.getOrderDetails)
router.get("/invoice",userAuth,orderController.getInvoice)
router.put("/cancelOrder",userAuth,orderController.cancelOrder)
router.post("/returnOrder",userAuth,orderController.returnOrder)

router.put("/orders/cancelItem",userAuth,orderController.cancelOrderItem)
router.get("/paymentFailure",userAuth,orderController.paymentFailure)
router.get("/retryPayment",userAuth,orderController.loadRetryPayment)
router.put("/retryPayment/cod",userAuth,orderController.retryPaymentCod)
router.put("/retryPayment/wallet",userAuth,orderController.retryPaymentWallet)
router.post("/retryPayment/online",userAuth,orderController.retryPaymentOnline)
router.post("/retryPayment/verifyPayment",userAuth,orderController.retryVerifyPayment)
// router.get("/viewOrderProductDetails",userAuth,orderController.viewOrderProductDetails)


  //wishlist
  
router.get("/wishlist",userAuth,wishlistController.loadWishlist)
router.post("/addToWishlist",userAuth,wishlistController.addToWishlist)
router.delete("/wishlist",userAuth,wishlistController.removeProduct)

//wallet

router.get('/wallet',userAuth,walletController.loadWallet)

router.post("/wallet/createOrder",userAuth, walletController.createOrder);
router.post("/wallet/verifyPayment",userAuth, walletController.verifyPayment);
router.put("/wallet/withdrawMoney",userAuth,walletController.withdrawMoney);
router.post("/placeWalletOrder",userAuth,orderController.placeWalletOrder)



//razorpay
router.post("/order/createOrder",userAuth,orderController.createOrder)
router.post("/order/verifyPayment",userAuth,orderController.verifyPayment)



router.get('/auth/google',passport.authenticate("google",{scope:['profile','email']}));



router.get("/auth/google/callback",
    passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
        res.redirect('/')
});





module.exports=router;