const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const bannerController = require("../controllers/admin/bannerController");
const adminOrderController = require("../controllers/admin/adminOrderController");
const couponController = require("../controllers/admin/couponController");
const walletController = require("../controllers/admin/walletController");
const returnController = require("../controllers/admin/returnController");
const session = require("express-session");

const { userAuth, adminAuth } = require("../middlewares/auth");

const multer = require("multer");

const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/re-image/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const uploads = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  },
});

const adminSession = session({
  name: "admin_sid",
  secret: process.env.ADMIN_SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
});

router.use(adminSession);

router.get("/pageerror", adminController.pageerror);
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/dashboard", adminAuth, adminController.getAdminDashboard);
router.get(
  "/dashboardAnalytics",
  adminAuth,
  adminController.getDashboardAnalytics
);
router.get("/generateLedger", adminAuth, adminController.generateLedgerBook);

router.get("/logout", adminController.logout);

router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);

router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post(
  "/addCategoryOffer",
  adminAuth,
  categoryController.addCategoryOffer
);
router.post(
  "/removeCategoryOffer",
  adminAuth,
  categoryController.removeCategoryOffer
);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);

router.get("/brands", adminAuth, brandController.getBrandPage);
router.post(
  "/addBrand",
  adminAuth,
  uploads.single("image"),
  brandController.addBrand
);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);

router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post(
  "/addProducts",
  adminAuth,
  uploads.array("images", 3),
  productController.addProducts
);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addProductOffer", adminAuth, productController.addProductOffer);
router.post(
  "/updateProductOffer",
  adminAuth,
  productController.updateProductOffer
);
router.post(
  "/removeProductOffer",
  adminAuth,
  productController.removeProductOffer
);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post(
  "/editProduct/:id",
  adminAuth,
  uploads.array("images", 3),
  productController.editProduct
);

router.post("/deleteImage", adminAuth, productController.deleteImage);

router.post("/deleteTempImage", adminAuth, productController.deleteTempImage);

router.get("/banner", adminAuth, bannerController.getBannerPage);
router.get("/addBanner", adminAuth, bannerController.getAddBannerPage);
router.post(
  "/addBanner",
  adminAuth,
  uploads.single("images"),
  bannerController.addBanner
);
router.get("/deleteBanner", adminAuth, bannerController.deleteBanner);

router.get("/orders", adminAuth, adminOrderController.getOrders);
router.put("/updateStatus", adminAuth, adminOrderController.updateStatus);
router.put("/orderCancel", adminAuth, adminOrderController.cancelOrder);
router.get(
  "/adminOrders/:orderId",
  adminAuth,
  adminOrderController.getOrderDetails
);
router.put("/handleReturn", adminAuth, adminOrderController.handleReturn);

router.get("/sales", adminAuth, adminOrderController.loadSales);
router.get("/salesReport", adminAuth, adminOrderController.loadSalesReport);

router.get("/walletHistory", adminAuth, walletController.loadWalletHistory);

router.post(
  "/handleReturn/:productId",
  adminAuth,
  adminOrderController.returnItemStatus
);
router.post("/handleItemReturn", adminAuth, returnController.handleItemReturn);
router.put(
  "/updateItemReturnStatus",
  adminAuth,
  returnController.updateItemReturnStatus
);

router.get("/inventory", adminAuth, productController.loadInventoryPage);
router.patch("/inventory", adminAuth, productController.updateInventoryy);

router.get("/coupon", adminAuth, couponController.loadCoupon);
router.post("/coupon", adminAuth, couponController.addCoupon);
router.put("/coupon", adminAuth, couponController.editCoupon);
router.delete("/coupon", adminAuth, couponController.deleteCoupon);

module.exports = router;
