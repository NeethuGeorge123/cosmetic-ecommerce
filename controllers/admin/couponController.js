const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSignupSchema");
const Order= require("../../models/orderSchema");
const Coupon=require("../../models/couponSchema")


const loadCoupon = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10; 
      const skip = (page - 1) * limit;
  
      const totalCoupons = await Coupon.countDocuments();
      const coupons = await Coupon.find()
        .sort({ createdOn: -1 }) 
        .skip(skip)
        .limit(limit);
  
      const totalPages = Math.ceil(totalCoupons / limit);
  
      res.render("admin/coupon", {
        coupons,
        currentPage: page,
        totalPages,
        layout: "layouts/admin", 
      });
    } catch (error) {
      console.error("Error loading coupons:", error);
      res.status(500).render("error", { message: "Server error while loading coupons" });
    }
  };
  

  const addCoupon = async (req, res) => {
    try {
      const userId= req.session.user;
      const { couponName, startDate, endDate, discountType, offerPrice, discountPercentage, maxDiscountAmount, minimumPrice } = req.body;
  
  
      if (!couponName || !/^[A-Za-z0-9 ]{3,50}$/.test(couponName)) {
        return res.status(400).json({ success: false, message: "Coupon name must be alphanumeric (3-50 characters)" });
      }
  
      if (!startDate || new Date(startDate) < new Date().setHours(0, 0, 0, 0)) {
        return res.status(400).json({ success: false, message: "Start date must be today or later" });
      }
  
      if (!endDate || new Date(endDate) <= new Date(startDate)) {
        return res.status(400).json({ success: false, message: "End date must be after start date" });
      }
  
      if (!discountType || !["offerPrice", "offerPercentage"].includes(discountType)) {
        return res.status(400).json({ success: false, message: "Invalid discount type" });
      }
  
      const offerPriceNum = parseFloat(offerPrice);
      const discountPercentageNum = parseFloat(discountPercentage);
      const maxDiscountAmountNum = parseFloat(maxDiscountAmount);
      const minimumPriceNum = parseFloat(minimumPrice);
  
      if (!minimumPriceNum || minimumPriceNum <= 0) {
        return res.status(400).json({ success: false, message: "Minimum price must be a positive number" });
      }
  
      if (discountType === "offerPrice") {
        if (!offerPriceNum || offerPriceNum <= 0) {
          return res.status(400).json({ success: false, message: "Offer price must be a positive number" });
        }
        if (minimumPriceNum < offerPriceNum) {
          return res.status(400).json({ success: false, message: "Minimum price cannot be less than offer price" });
        }
      } else if (discountType === "offerPercentage") {
        if (!discountPercentageNum || discountPercentageNum < 1 || discountPercentageNum > 99) {
          return res.status(400).json({ success: false, message: "Discount percentage must be between 1 and 99" });
        }
        if (!maxDiscountAmountNum || maxDiscountAmountNum <= 0) {
          return res.status(400).json({ success: false, message: "Maximum discount amount must be a positive number" });
        }
        if (minimumPriceNum < maxDiscountAmountNum) {
          return res.status(400).json({ success: false, message: "Minimum price cannot be less than max discount amount" });
        }
      }
  
      
      const existingCoupon = await Coupon.findOne({ name: couponName });
      if (existingCoupon) {
        return res.status(400).json({ success: false, message: "Coupon name already exists" });
      }
  
    
      const coupon = new Coupon({
        name: couponName,
        createdOn: new Date(startDate),
        expireOn: new Date(endDate),
        offerPrice: discountType === "offerPrice" ? offerPriceNum : 0,
        discountPercentage: discountType === "offerPercentage" ? discountPercentageNum : 0,
        maxDiscountAmount: discountType === "offerPercentage" ? maxDiscountAmountNum : 0,
        minimumPrice: minimumPriceNum,
        isList: true,
         //userId: [],
      });

      await Coupon.updateOne(
        { _id: coupon._id },
        { $addToSet: { userId: userId } }
      );
  
      await coupon.save();
      res.json({ success: true, message: "Coupon added successfully" });
    } catch (error) {
      console.error("Error adding coupon:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
  
  const editCoupon = async (req, res) => {
    try {
      const couponId = req.query.id;
      const { name, createdOn, expireOn, discountType, offerPrice, discountPercentage, maxDiscountAmount, minimumPrice } = req.body;
  
      
      if (!couponId) {
        return res.status(400).json({ success: false, message: "Coupon ID is required" });
      }
  
      if (!name || !/^[A-Za-z0-9 ]{3,50}$/.test(name)) {
        return res.status(400).json({ success: false, message: "Coupon name must be alphanumeric (3-50 characters)" });
      }
  
      if (!createdOn) {
        return res.status(400).json({ success: false, message: "Created date is required" });
      }
  
      if (!expireOn || new Date(expireOn) <= new Date(createdOn)) {
        return res.status(400).json({ success: false, message: "Expire date must be after created date" });
      }
  
      if (!discountType || !["offerPrice", "offerPercentage"].includes(discountType)) {
        return res.status(400).json({ success: false, message: "Invalid discount type" });
      }
  
      const offerPriceNum = parseFloat(offerPrice);
      const discountPercentageNum = parseFloat(discountPercentage);
      const maxDiscountAmountNum = parseFloat(maxDiscountAmount);
      const minimumPriceNum = parseFloat(minimumPrice);
  
      if (!minimumPriceNum || minimumPriceNum <= 0) {
        return res.status(400).json({ success: false, message: "Minimum price must be a positive number" });
      }
  
      if (discountType === "offerPrice") {
        if (!offerPriceNum || offerPriceNum <= 0) {
          return res.status(400).json({ success: false, message: "Offer price must be a positive number" });
        }
        if (minimumPriceNum < offerPriceNum) {
          return res.status(400).json({ success: false, message: "Minimum price cannot be less than offer price" });
        }
      } else if (discountType === "offerPercentage") {
        if (!discountPercentageNum || discountPercentageNum < 1 || discountPercentageNum > 99) {
          return res.status(400).json({ success: false, message: "Discount percentage must be between 1 and 99" });
        }
        if (!maxDiscountAmountNum || maxDiscountAmountNum <= 0) {
          return res.status(400).json({ success: false, message: "Maximum discount amount must be a positive number" });
        }
        if (minimumPriceNum < maxDiscountAmountNum) {
          return res.status(400).json({ success: false, message: "Minimum price cannot be less than max discount amount" });
        }
      }
  
      
      const existingCoupon = await Coupon.findOne({ name, _id: { $ne: couponId } });
      if (existingCoupon) {
        return res.status(400).json({ success: false, message: "Coupon name already exists" });
      }
  
    
      const updatedCoupon = await Coupon.findByIdAndUpdate(
        couponId,
        {
          name,
          createdOn: new Date(createdOn),
          expireOn: new Date(expireOn),
          offerPrice: discountType === "offerPrice" ? offerPriceNum : 0,
          discountPercentage: discountType === "offerPercentage" ? discountPercentageNum : 0,
          maxDiscountAmount: discountType === "offerPercentage" ? maxDiscountAmountNum : 0,
          minimumPrice: minimumPriceNum,
        },
        { new: true }
      );
  
      if (!updatedCoupon) {
        return res.status(404).json({ success: false, message: "Coupon not found" });
      }
  
      res.json({ success: true, message: "Coupon updated successfully" });
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
  
  const deleteCoupon = async (req, res) => {
    try {
      const couponId = req.query.id;
  
      if (!couponId) {
        return res.status(400).json({ success: false, message: "Coupon ID is required" });
      }
  
      const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
      if (!deletedCoupon) {
        return res.status(404).json({ success: false, message: "Coupon not found" });
      }
  
      res.json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
  module.exports = { loadCoupon, addCoupon, editCoupon, deleteCoupon };