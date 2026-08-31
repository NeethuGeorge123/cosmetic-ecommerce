
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Wallet=require("../../models/walletSchema")
const User = require("../../models/userSignupSchema");
const Order= require("../../models/orderSchema");


const handleItemReturn = async (req, res) => {
  try {
    const { action, orderId, itemId, category, message } = req.body;
    
   
    
    if (!orderId || !itemId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID and Item ID required' 
      });
    }

    const order = await Order.findOne({ orderId: orderId });
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    const item = order.orderedItems.id(itemId);

    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found' 
      });
    }

    console.log("Current status:", item.product.returnItemStatus);

    if (item.product.returnItemStatus !== 'return_requested') {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending return request' 
      });
    }

    if (action === 'approved') {
      item.product.returnItemStatus = 'returning';
      
      await order.save();
      
      

      return res.status(200).json({ 
        success: true, 
        message: 'Item return approved' 
      });
    }

    if (action === 'rejected') {
      if (!category || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'Category and reason required' 
        });
      }

      item.product.returnItemStatus = 'rejected';
      item.rejectionCategory = category;            
      item.rejectionReason = message;
      await order.save();
      
      

      return res.status(200).json({ 
        success: true, 
        message: 'Return rejected' 
      });
    }

  } catch (error) {
    
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};


  const updateItemReturnStatus = async (req, res) => {
    try {
      const { orderId, status, itemId } = req.body;
      
      
  
      
      if (!orderId || !status || !itemId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields' 
        });
      }
  
      
      const order = await Order.findOne({ orderId: orderId });
      
      if (!order) {
        
        return res.status(404).json({ 
          success: false, 
          message: 'Order not found' 
        });
      }
  
     
      const item = order.orderedItems.id(itemId);
      
      if (!item) {
        
        return res.status(404).json({ 
          success: false, 
          message: 'Item not found in order' 
        });
      }
  
      console.log("Current status:", item.product.returnItemStatus);
  
      
      if (item.product.returnItemStatus !== 'returning') {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot update. Current status is: ${item.product.returnItemStatus}` 
        });
      }
  
      let refundAmount = 0;
  
      
      if (status === 'returning') {
        
        item.product.returnItemStatus = 'returning';
        
        
      } else if (status === 'returned') {
        
        item.product.returnItemStatus = 'returned';
        
        
        const itemTotal = item.price * item.quantity;
       
  
        
        let couponDiscount = 0;
        
        if (order.discount && order.discount > 0) {
          
          const orderSubtotal = order.orderedItems.reduce((sum, itm) => {
            return sum + (itm.price * itm.quantity);
          }, 0);
          
          console.log("Order subtotal:", orderSubtotal);
          console.log("Order discount:", order.discount);
          
          
          const discountPercentage = (order.discount / orderSubtotal) * 100;
          console.log("Discount percentage:", discountPercentage.toFixed(2) + "%");
          
          
          couponDiscount = (itemTotal * discountPercentage) / 100;
          console.log("Coupon discount for this item:", couponDiscount.toFixed(2));
        }
  
        
        refundAmount = Math.round((itemTotal - couponDiscount) * 100) / 100;
        console.log("Final refund amount:", refundAmount.toFixed(2));
  
        
        const user = await User.findById(order.userId);
        
        if (!user) {
          
          return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
          });
        }
  
        let wallet = await Wallet.findOne({ userId: order.userId });
  
        if (!wallet) {
          wallet = new Wallet({
            userId: order.userId,
            balance: 0,
            transactions: []
          });
        }
  
        
        wallet.transactions.push({
          amount: refundAmount,
          type: 'credit',
          description: `Refund for returned item - Order #${order.orderId}${couponDiscount > 0 ? ' (coupon adjusted)' : ''}`,
          date: new Date(),
          orderId: order._id
        });
  
        
        wallet.balance = (wallet.balance || 0) + refundAmount;
  
        await wallet.save();
  
        
        
        await user.save();
       
  
        
        const product = await Product.findById(item.product._id);
        
        if (product) {
          console.log("Product stock before:", product.quantity);
          product.quantity += item.quantity;
          console.log("Product stock after:", product.quantity);
          await product.save();
          
        } else {
          
        }
  
        
        
       

       order.finalAmount = Math.round(Math.max(0, order.finalAmount - refundAmount) * 100) / 100;
        
      }
  
      
      const allItemsReturned = order.orderedItems.every(
        itm => itm.product.returnItemStatus === 'returned'
      );
  
      console.log("All items returned?", allItemsReturned);
  
      if (allItemsReturned) {
        order.status = 'returned';
        
      }
  
      
      await order.save();
      
  
      return res.status(200).json({ 
        success: true, 
        message: 'Item return status updated successfully',
        refundAmount: refundAmount,
        orderStatus: order.status
      });
  
    } catch (error) {
     
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      });
    }
  };


  const showOrderDetails = async (req, res) => {
    try {
      
      const order = await Order.findById(req.params.id)
        .populate('userId')
        .populate('orderedItems.product');
      
      if (!order) {
        return res.redirect('/admin/adminOrders');
      }
  
      res.render('admin/adminOrderDetails', { order });
    } catch (error) {
      console.error('showOrderDetails error:', error);
      res.redirect('/admin/adminOrders');
    }
  };

  
  module.exports = { 
    //handleReturn, 
    handleItemReturn, 
    updateItemReturnStatus ,
    showOrderDetails,
    // updateOrderReturnStatus
  };