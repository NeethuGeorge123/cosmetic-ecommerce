const Product= require("../../models/productSchema")
const Category= require("../../models/categorySchema");
const User = require("../../models/userSignupSchema")
const Cart=require("../../models/cartSchema")
const Address=require("../../models/addressSchema")
const Order=require("../../models/orderSchema")
const Coupon=require("../../models/couponSchema")
const razorpay=require("../../config/razorpay")
const asyncHandler = require("../../middlewares/asyncHandler");
const messages=require("../../util/messages/orderMessages")
//const asyncHandler = require("../../middlewares/asyncHandler");


const returnItem = asyncHandler(async (req, res) => {
  const { orderId, itemId, reason } = req.body;
  const userId = req.session.user;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Please login again" });
  }

  

  const order = await Order.findOne({ orderId, userId });

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  const item = order.orderedItems.id(itemId);
  if (!item) {
    return res.status(404).json({ success: false, message: "Item not found" });
  }

  if (order.status.toLowerCase() !== "delivered") {
    return res.status(400).json({ 
      success: false, 
      message: "Only delivered orders can be returned" 
    });
  }

  
  if (item.product.returnItemStatus && item.product.returnItemStatus !== 'None') {
    return res.status(400).json({ 
      success: false, 
      message: `Return already ${item.product.returnItemStatus.replace('_', ' ')}` 
    });
  }

  
  item.product.returnItemStatus = "return_requested";
  
  

  await order.save();
  
  
  

  res.json({ 
    success: true, 
    message: "Item return request submitted successfully. Admin will review your request." 
  });
});
  module.exports = { returnItem };
 