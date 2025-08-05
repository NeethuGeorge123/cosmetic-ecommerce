const express=require("express");
const router=express.Router();
const adminController=require("../controllers/admin/adminController");
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const brandController=require("../controllers/admin/brandController")
const productController=require("../controllers/admin/productController")
const bannerController=require("../controllers/admin/bannerController")
const adminOrderController=require("../controllers/admin/adminOrderController")
const couponController=require("../controllers/admin/couponController")
const walletController=require("../controllers/admin/walletController")
//const walletController=require("../controllers/admin/walletController")

const {userAuth,adminAuth}=require("../middlewares/auth")
//const { upload } = require("../helpers/multer");

const multer = require("multer");
// const storage = require("../helpers/multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/re-image/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploads = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

// const uploads = multer({ storage: storage });


console.log("uploads",uploads)




router.get("/pageerror",adminController.pageerror)
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/dashboard",adminAuth,adminController.getAdminDashboard)
router.get('/dashboardAnalytics', adminAuth, adminController.getDashboardAnalytics);
router.get('/generateLedger', adminAuth, adminController.generateLedgerBook);

router.get("/logout",adminController.logout)
//customer
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked)

//category
router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer)
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer)
router.get ("/listCategory",adminAuth,categoryController.getListCategory)
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory)
router.get("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);


 
//brand management
router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand)
router.get("/blockBrand",adminAuth,brandController.blockBrand)
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand)
router.get("/deleteBrand",adminAuth,brandController.deleteBrand)

//Product management
router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addProducts",adminAuth,uploads.array("images",3),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer)
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer)
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct)
router.post("/editProduct/:id",adminAuth,uploads.array("images",3),productController.editProduct)
// router.post("/deleteImage",adminAuth,productController.deleteSingleImage)



router.post('/deleteImage', adminAuth,productController.deleteImage);

// Route for deleting temporary (newly uploaded) images
router.post('/deleteTempImage',adminAuth, productController.deleteTempImage);


//Banner Management
router.get("/banner",adminAuth,bannerController.getBannerPage)
router.get("/addBanner",adminAuth,bannerController.getAddBannerPage)
router.post("/addBanner",adminAuth,uploads.single("images"),bannerController.addBanner)
router.get("/deleteBanner",adminAuth,bannerController.deleteBanner);



//Order Management

router.get("/orders",adminAuth, adminOrderController.getOrders);
router.put("/updateStatus",adminAuth,adminOrderController.updateStatus)
router.put("/orderCancel",adminAuth,adminOrderController.cancelOrder)
router.get("/adminOrders/:orderId", adminAuth, adminOrderController.getOrderDetails);
router.put("/handleReturn",adminAuth,adminOrderController.handleReturn)
 router.put("/updateReturnStatus",adminAuth,adminOrderController.updateReturnStatus)
 router.get("/sales",adminAuth,adminOrderController.loadSales)
 router.get("/salesReport",adminAuth,adminOrderController.loadSalesReport)
//wallet
router.get("/walletHistory",adminAuth,walletController.loadWalletHistory)



//stock

router.get('/inventory', adminAuth,productController.loadInventoryPage);
router.patch('/inventory', adminAuth,productController.updateInventoryy);



//coupon
router.get("/coupon",adminAuth,couponController.loadCoupon)
router.post("/coupon",adminAuth,couponController.addCoupon)
router.put("/coupon",adminAuth,couponController.editCoupon)
router.delete("/coupon",adminAuth,couponController.deleteCoupon)





module.exports=router;