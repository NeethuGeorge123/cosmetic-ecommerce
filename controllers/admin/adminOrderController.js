const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Wallet=require("../../models/walletSchema")
const User = require("../../models/userSignupSchema");
const Order= require("../../models/orderSchema");

const refundToWallet = require("../../util/refundToWallet");

const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


const getOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const search = req.query.search || "";
  const sort = req.query.sort === "asc" ? 1 : -1;

  const filter = search
    ? { orderId: { $regex: search, $options: "i" } }
    : {};

  const orders = await Order.find(filter)
    .populate("userId")
    .sort({ createdOn: sort })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalOrders = await Order.countDocuments(filter);

  res.render("admin/orders", {
    orders,
    currentPage: page,
    totalPages: Math.ceil(totalOrders / limit),
    search,
    sort: req.query.sort || "desc"
  });
};



const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        console.log("req.body from statussss",req.body)

        console.log("STATUS:",status)

        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: "Missing orderId or status" });
        }
        const order = await Order.findOne({ orderId: orderId });

        console.log("Orderrrrrrr",order)

      
        const validStatuses = ['Pending','Processing','shipped','delivered','cancelled','return requested','returned','returning','confirmed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: orderId },
            { $set: { status: status } },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({ success: true, message: "Order status updated", order: updatedOrder });

    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

    

const cancelOrder = async (req, res) => {
  try {
      const { orderId } = req.body;  

      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required" });
      }

      const order = await Order.findOne({ orderId });

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      let wallet = null;

      if (order.paymentMethod !== "cod" && order.finalAmount > 0) {
        wallet = await refundToWallet(
          order.userId,
          order.finalAmount,
          order._id,
          `Refund for admin-cancelled order #${orderId}`
        );
      }

      order.status = "cancelled";
      order.cancellationReason = "Cancelled by admin";
      order.cancelledAt = new Date();
      order.finalAmount = 0;

      
      const itemsToRestock = [];

      order.orderedItems.forEach(item => {
        if (item.cancellationStatus !== "cancelled") {
          item.cancellationStatus = "cancelled";
          item.cancellationReason = "Cancelled by admin";
          item.cancelledAt = new Date();
          itemsToRestock.push(item);
        }
      });
      console.log("Item statuses before save:", order.orderedItems.map(i => i.cancellationStatus));
      await order.save();
      const verify = await Order.findOne({ orderId });
console.log("Item statuses after save (re-fetched):", verify.orderedItems.map(i => i.cancellationStatus));

      
      for (const item of itemsToRestock) {
        await Product.findByIdAndUpdate(item.product._id, { $inc: { quantity: item.quantity } });
      }

      return res.status(200).json({
          success: true,
          message: "Order cancelled successfully",
          order,
          wallet,
      });

  } catch (error) {
      console.error("Error cancelling order:", error);
      return res.status(500).json({
          success: false,
          message: "Internal server error"
      });
  }
};
const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    

    const order = await Order.findById(orderId).lean();

   

    if (!order) {
      return res.status(404).render('admin/404'); 
    }

    res.render('admin/orderDetails', { order });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).send("Internal server error");
  }
};


const changeOrderStatus = async (req, res) => {
  console.log("change status")
  const { orderId, newStatus } = req.body;

  await Order.findByIdAndUpdate(orderId, { status: newStatus });
  res.redirect("/admin/orders");
};

const verifyReturn = async (req, res) => {
  const { orderId, productId } = req.body;

  const order = await Order.findById(orderId);
  const user = await User.findById(order.userId);

  const item = order.orderedItems.find(
    item => item.product._id.toString() === productId
  );

  if (!item) return res.redirect("/admin/orders");

  item.status = "Returned";
  user.wallet = (user.wallet || 0) + item.quantity * item.price;

  await order.save();
  await user.save();

  res.redirect("/admin/orders");
};






const handleReturn = async (req, res) => {
  try {
    const { action, orderId, category, message } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

    if (action === 'approved') {
      const order = await Order.findById(orderId).populate('userId');
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      

      let refundAmount = 0;

      // Process every non-cancelled, not-already-returned item
      for (const item of order.orderedItems) {
        if (item.cancellationStatus === 'cancelled') {
         
          continue;
        }
        if (item.product.returnItemStatus === 'returned') {
         
          continue;
        }

        item.product.returnItemStatus = 'returned';

        const itemTotal = item.price * item.quantity;
        

        // Proportional coupon discount adjustment
        let couponDiscount = 0;
        if (order.discount && order.discount > 0) {
          const orderSubtotal = order.orderedItems.reduce(
            (sum, itm) => sum + (itm.price * itm.quantity), 0
          );
          const discountPercentage = (order.discount / orderSubtotal) * 100;
          couponDiscount = (itemTotal * discountPercentage) / 100;
        }

        const itemRefund = Math.round((itemTotal - couponDiscount) * 100) / 100;
        refundAmount += itemRefund;
        

        // Restore stock
        await Product.findByIdAndUpdate(item.product._id, { $inc: { quantity: item.quantity } });
      }

      console.log("🏁 Final refundAmount:", refundAmount);

      // Refund to wallet
      if (refundAmount > 0) {
       
        const walletResult = await refundToWallet(
          order.userId,
          refundAmount,
          order._id,
          `Refund for returned order #${order.orderId}`
        );
        
        order.finalAmount = Math.round(Math.max(0, order.finalAmount - refundAmount) * 100) / 100;
      } else {
        
      }

      order.requestStatus = 'approved';
      order.status = 'returned';

      await order.save();
      

      return res.status(200).json({
        success: true,
        message: 'Return approved and processed successfully',
        refundAmount
      });
    }

    if (action === 'rejected') {
      const updateObj = {
        requestStatus: 'rejected',
        status: 'delivered',
        rejectionCategory: category || '',
        rejectionReason: message || '',
        rejectedOn: new Date()
      };

      const order = await Order.findByIdAndUpdate(orderId, { $set: updateObj }, { new: true });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.status(200).json({ success: true, message: 'Return Request Rejected' });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (error) {
    console.error('handleReturn error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};




const returnItemStatus = async (req, res) => {
  try {
    console.log("Inside returnItemStatus controller");

    
    const { orderId, actionType, reason, productId } = req.body;
   

    
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    
    const orderedItem = order.orderedItems.find(
      item => item.product._id.toString() === productId
    );
    if (!orderedItem) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    
    if (actionType === 'request') orderedItem.product.returnItemStatus = 'return_requested';
    else if (actionType === 'accept') orderedItem.product.returnItemStatus = 'returning';
    else if (actionType === 'reject') orderedItem.product.returnItemStatus = 'return_rejected';
    else if (actionType === 'update') orderedItem.product.returnItemStatus = 'returned';

    orderedItem.product.returnReason = reason || '';

    
    const returnStatuses = order.orderedItems.map(item => item.product.returnItemStatus);

    
    if (returnStatuses.every(status => status === 'returned')) {
      order.status = 'returned';
    } else if (returnStatuses.every(status => status === 'None')) {
      order.status = 'delivered';
    } else {
      order.status = 'delivered'; 
    }

    
    await order.save();

    
    res.json({
      success: true,
      message: `Return ${actionType}ed successfully`,
      updatedItem: orderedItem,
      orderStatus: order.status
    });

  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};






const updateReturnStatus = async (req, res) => {
  try {
    const { orderId, status, productId } = req.body;
    
    console.log("Update Return Status:", { orderId, status, productId });

    
    const order = await Order.findOne({ orderId: orderId });
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    let refundAmount = 0; 

    
    if (productId) {
      const item = order.orderedItems.find(
        item => item.product._id.toString() === productId
      );
      
      if (!item) {
        return res.status(404).json({ 
          success: false, 
          message: 'Product not found in order' 
        });
      }
      
      
      item.returnStatus = status;
      
      
      if (status === 'returned') {
        refundAmount = item.price * item.quantity;
      }
      
      
      const allReturned = order.orderedItems.every(
        item => item.returnStatus === 'returned'
      );
      
      if (allReturned) {
        order.status = 'returned';
      } else if (status === 'returning') {
        order.status = 'returning';
      }
      
    } else {
      
      order.status = status;
      
      
      order.orderedItems.forEach(item => {
        item.returnStatus = status;
      });
      
      
      if (status === 'returned') {
        refundAmount = order.finalAmount;
      }
    }

    
    await order.save();

    
    if (status === 'returned' && refundAmount > 0) {
      const user = await User.findById(order.userId);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      
      let wallet=null
      let finalAmount=Math.ceil(refundAmount)
      if(order.paymentMethod!=="cod" && order.finalAmount>0){
        wallet=await refundToWallet(
          order.userId,
          order.finalAmount,
          order._id,
          `Refund for order returned #${orderId}`
        );
      }  

      for(const item of order.orderedItems){
        await Product.findByIdAndUpdate(item.product._id,{$inc:{quantity:item.quantity}})
      }
      
      await user.save();
      
      
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Return status updated successfully',
      refundAmount: refundAmount,
      orderStatus: order.status
    });

  } catch (error) {
    console.error('Update Return Status Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
};

const loadSales = async (req, res) => {
  try {
    const range = req.query.range || "daily";
    const now = new Date();
    let startDate, endDate;

    if (range === "daily") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (range === "weekly") {
      const now = new Date();
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "custom") {
      startDate = new Date(req.query.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.to);
      endDate.setHours(23, 59, 59, 999);
    }

    const orders = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdOn: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $facet: {
          overallStats: [
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$totalPrice" },
                totalDiscounts: { $sum: "$discount" },
                totalPrice: { $sum: "$finalAmount" },
                totalOrders: { $sum: 1 },
                totalProducts: { $sum: { $size: "$orderedItems" } },
              },
            },
          ],
          monthlyStats: [
            {
              $group: {
                _id: { $month: "$createdOn" },
                netRevenue: { $sum: { $subtract: ["$totalPrice", "$discount"] } },
                orderCount: { $sum: 1 },
              },
            },
            {
              $sort: { _id: 1 },
            },
          ],
        },
      },
      {
        $project: {
          totalSales: { $arrayElemAt: ["$overallStats.totalSales", 0] },
          totalDiscounts: { $arrayElemAt: ["$overallStats.totalDiscounts", 0] },
          totalPrice: { $arrayElemAt: ["$overallStats.totalPrice", 0] },
          totalOrders: { $arrayElemAt: ["$overallStats.totalOrders", 0] },
          totalProducts: { $arrayElemAt: ["$overallStats.totalProducts", 0] },
          monthlyStats: 1,
        },
      },
    ]);

    const stats = orders[0] || {
      totalSales: 0,
      totalDiscounts: 0,
      totalPrice: 0,
      totalOrders: 0,
      totalProducts: 0,
      monthlyStats: [],
    };

    const netRevenue = stats.totalSales - stats.totalDiscounts;
    const averageOrderValue =
      stats.totalOrders > 0 ? stats.totalPrice / stats.totalOrders : 0;

    const monthLabels = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const sales = Array(12).fill(0);
    const ordersCount = Array(12).fill(0);

    stats.monthlyStats.forEach((monthData) => {
      const index = monthData._id - 1;
      sales[index] = monthData.netRevenue;
      ordersCount[index] = monthData.orderCount;
    });

    const salesData = {
      months: monthLabels,
      sales,
      orders: ordersCount,
    };

    res.render("admin/sales", {
      totalSales: stats.totalSales || 0,
      totalOrders: stats.totalOrders || 0,
      totalProducts: stats.totalProducts || 0,
      totalDiscounts: stats.totalDiscounts || 0,
      netRevenue: netRevenue || 0,
      averageOrderValue: averageOrderValue || 0,
      salesData,
      range,
      from: req.query.from,
      to: req.query.to,
    });
  } catch (error) {
    console.log(error);
  }
};



const loadSalesReport = async (req, res, next) => {
  try {
    const range = req.query.range || "daily";
    const now = new Date();
    let startDate, endDate;

    if (range === "daily") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (range === "weekly") {
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === "custom") {
      startDate = new Date(req.query.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.to);
      endDate.setHours(23, 59, 59, 999);
      const today=new Date()
      today.setHours(23,59,59,999)
      if(endDate>today){
        return res.json({success:false,message:"End date canot greater than today"})
      }
    }

    const orders = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdOn: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $facet: {
          overallStats: [
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$totalPrice" },
                totalDiscounts: { $sum: "$discount" },
                totalPrice: { $sum: "$finalAmount" },
                totalOrders: { $sum: 1 },
                totalProducts: { $sum: { $size: "$orderedItems" } },
              },
            },
          ],
          monthlyStats: [
            {
              $group: {
                _id: { $month: "$createdOn" },
                netRevenue: { $sum: { $subtract: ["$totalPrice", "$discount"] } },
                orderCount: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          detailedOrders: [
            {
              $sort: { createdOn: -1 },
            },
          ],
        },
      },
      {
        $project: {
          totalSales: { $arrayElemAt: ["$overallStats.totalSales", 0] },
          totalDiscounts: { $arrayElemAt: ["$overallStats.totalDiscounts", 0] },
          totalPrice: { $arrayElemAt: ["$overallStats.totalPrice", 0] },
          totalOrders: { $arrayElemAt: ["$overallStats.totalOrders", 0] },
          totalProducts: { $arrayElemAt: ["$overallStats.totalProducts", 0] },
          monthlyStats: 1,
          detailedOrders: 1,
        },
      },
    ]);

    const stats = orders[0] || {
      totalSales: 0,
      totalDiscounts: 0,
      totalPrice: 0,
      totalOrders: 0,
      totalProducts: 0,
      monthlyStats: [],
      detailedOrders: [],
    };

    const netRevenue = stats.totalSales - stats.totalDiscounts;
    const averageOrderValue =
      stats.totalOrders > 0 ? stats.totalPrice / stats.totalOrders : 0;

    
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sales = Array(12).fill(0);
    const ordersCount = Array(12).fill(0);

    stats.monthlyStats.forEach((monthData) => {
      const index = monthData._id - 1;
      sales[index] = monthData.netRevenue;
      ordersCount[index] = monthData.orderCount;
    });

    const salesData = {
      months: monthLabels,
      sales,
      orders: ordersCount,
    };

    res.render("admin/salesReport", {
      totalSales: stats.totalSales || 0,
      totalOrders: stats.totalOrders || 0,
      totalProducts: stats.totalProducts || 0,
      totalDiscounts: stats.totalDiscounts || 0,
      netRevenue: netRevenue || 0,
      averageOrderValue: averageOrderValue || 0,
      salesData: salesData || { months: [], sales: [], orders: [] },
      range,
      from: req.query.from,
      to: req.query.to,
      orders: stats.detailedOrders || [],
      startDate,
      endDate,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getOrders,
  updateStatus,
  cancelOrder,
  getOrderDetails,
  changeOrderStatus,
  verifyReturn,
  handleReturn,
  updateReturnStatus,
  loadSales,
  loadSalesReport,
  returnItemStatus
};
