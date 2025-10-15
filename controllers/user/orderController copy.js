
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

const refundToWallet = require("../../util/refundToWallet");
const crypto=require("crypto")
const Wallet=require("../../models/walletSchema")
const { v4: uuidv4 } = require("uuid");

const generateOrderId = () => {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const dateString = `${yyyy}${mm}${dd}`;
  return `ORD${dateString}-${randomNumber}`;
};
  
// const placeOrder =asyncHandler(async (req, res) => {
 
//     const { addressId, paymentMethod, couponCode } = req.body;
//     const userId = req.session.user;

    
//     if (!addressId || !paymentMethod) {
//       return res.status(400).json({ success: false, message: messages.REQUIRED_ADDRESS_PAYMENT });
//     }

    
//     if (!['cod', 'wallet', 'online payment'].includes(paymentMethod)) {
//       return res.status(400).json({ success: false, message: messages.INVALID_PAYMENT_METHOD });
//     }

    
//     const userAddress = await Address.findOne({ userId });
//     if (!userAddress) {
//       return res.status(404).json({ success: false, message: messages.NO_ADDRESS_FOUND });
//     }
//     const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
//     if (!selectedAddress) {
//       return res.status(404).json({ success: false, message: messages.ADDRESS_NOT_FOUND });
//     }

    
//     const cart = await Cart.findOne({ userId }).populate({ path: 'items.productId' });
//     if (!cart || !cart.items.length) {
//       return res.status(400).json({ success: false, message: messages.CART_EMPTY });
//     }

    
//     let subtotal = 0;
//     cart.items.forEach(item => {
//       subtotal += item.productId.salePrice * item.quantity;
//     });
    

    
//     let discount = 0;
//     let couponApplied = false; 
//     if (couponCode) {
//       const coupon = await Coupon.findOne({ name: couponCode, isActive: true });
//       if (!coupon) {
//         return res.status(400).json({ success: false, message: messages.INVALID_COUPON });
//       }
//       if (subtotal < coupon.minimumPrice) {
//          return res.status(400).json({ success: false, message: messages.COUPON_MINIMUM(coupon.minimumPrice) });
//       }
//       if (coupon.expireOn < new Date()) {
//         return res.status(400).json({ success: false, message: messages.COUPON_EXPIRED });
//       }
//       if (coupon.discountPercentage) {
//         discount = (subtotal * coupon.discountPercentage) / 100;
//         if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
//           discount = coupon.maxDiscountAmount;
//         }
//       } else if (coupon.offerPrice) {
//         discount = coupon.offerPrice;
//       }
//       couponApplied = true; 
//     }

    
//     const shippingCharge = subtotal < 500 ? 50 : 0; 
    
//     const total = subtotal - discount + shippingCharge;
//     console.log("SUBTOTAL:",total)

    
//     if (paymentMethod === 'cod' && total > 1000) {
//       return res.status(400).json({
//         success: false,
//         message: messages.COD_LIMIT_EXCEEDED,
//       }); 
//     }
//     //console.log("CATEGORYYY:",cart.items)
//     const orderId=generateOrderId()
//     const order = new Order({
//       orderId,  
//       userId,
//       orderedItems: cart.items.map(item => ({
//         product: {
//           productName: item.productId.productName,
//           _id: item.productId._id,
//           description: item.productId.description,
//           brand: item.productId.brand,
//           category: item.productId.category,
//           regularPrice: item.productId.regularPrice,
//           salePrice: item.productId.salePrice,
//           productOffer: item.productId.productOffer || 0,
//           quantity: item.productId.quantity,
//           color: item.productId.color,
//           productImage: item.productId.productImage,
//         },
//         quantity: item.quantity,
//         price: item.productId.salePrice,
//         cancellationStatus: 'active', 
//       })),
//       address: {
//         addressType: selectedAddress.addressType,
//         name: selectedAddress.name,
//         city: selectedAddress.city,
//         landMark: selectedAddress.landMark,
//         state: selectedAddress.state,
//         pincode: selectedAddress.pincode,
//         phone: selectedAddress.phone,
//         altPhone: selectedAddress.altPhone,
//       },
//       totalPrice: subtotal,
//       discount,
//       finalAmount: total,
//       paymentMethod,
//       couponApplied, 
//       status: 'Processing',
//       createdOn: new Date(), 
//       invoiceDate: new Date(), 
//     });

//     await order.save();

    
//     for (const item of cart.items) {
//       await Product.findByIdAndUpdate(item.productId._id, {
//         $inc: { quantity: -item.quantity },
//       });
//     }

    
//     await User.findByIdAndUpdate(userId, {
//       $push: { orderHistory: order._id },
//     });

    
//     await Cart.findOneAndUpdate(
//       { userId },
//       { $set: { items: [], discount: 0 } }
//     );

//     return res.status(200).json({ success: true, message: messages.ORDER_SUCCESS, orderId: order.orderId }); 
 
// });
// const placeOrder =asyncHandler(async (req, res) => {
 
//   const { addressId, paymentMethod, couponCode } = req.body;
//   const userId = req.session.user;

  
//   if (!addressId || !paymentMethod) {
//     return res.status(400).json({ success: false, message: messages.REQUIRED_ADDRESS_PAYMENT });
//   }

  
//   if (!['cod', 'wallet', 'online payment'].includes(paymentMethod)) {
//     return res.status(400).json({ success: false, message: messages.INVALID_PAYMENT_METHOD });
//   }

  
//   const userAddress = await Address.findOne({ userId });
//   if (!userAddress) {
//     return res.status(404).json({ success: false, message: messages.NO_ADDRESS_FOUND });
//   }
//   const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
//   if (!selectedAddress) {
//     return res.status(404).json({ success: false, message: messages.ADDRESS_NOT_FOUND });
//   }

  
//   const cart = await Cart.findOne({ userId }).populate({ path: 'items.productId' });
//   if (!cart || !cart.items.length) {
//     return res.status(400).json({ success: false, message: messages.CART_EMPTY });
//   }

  
//   let subtotal = 0;
//   cart.items.forEach(item => {
//     subtotal += item.productId.salePrice * item.quantity;
//   });
  

  
//   let discount = 0;
//   let couponApplied = false; 
//   let validatedCoupon = null;
//   if (couponCode) {
//     const coupon = await Coupon.findOne({ name: couponCode, isActive: true });
//     if (!coupon) {
//       return res.status(400).json({ success: false, message: messages.INVALID_COUPON });
//     }

//     const currentDate=new Date()
//     if (coupon.expireOn < new Date()) {
//       await Cart.findOneAndUpdate({userId},{$set:{discount:0}})
//       return res.status(400).json({ success: false, message: messages.COUPON_EXPIRED });
//     }
    
//     if (subtotal < coupon.minimumPrice) {
//        return res.status(400).json({ success: false, message: messages.COUPON_MINIMUM(coupon.minimumPrice) });
//     }
   
//     if (coupon.userId && coupon.userId.includes(userId)) {
//       console.log(`❌ User has already used this coupon`);
//       return res.status(400).json({ 
//         success: false, 
//         message: "You have already used this coupon" 
//       });
//     }
//     if (coupon.discountPercentage) {
//       discount = (subtotal * coupon.discountPercentage) / 100;
//       if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
//         discount = coupon.maxDiscountAmount;
//       }
//     } else if (coupon.offerPrice) {
//       discount = coupon.offerPrice;
//     }
//     couponApplied = true; 
//     validatedCoupon=coupon;
//   }

  
//   const shippingCharge = subtotal < 500 ? 50 : 0; 
  
//   const total = subtotal - discount + shippingCharge;
//   console.log("SUBTOTAL:",total)

  
//   if (paymentMethod === 'cod' && total > 1000) {
//     return res.status(400).json({
//       success: false,
//       message: messages.COD_LIMIT_EXCEEDED,
//     }); 
//   }
//   //console.log("CATEGORYYY:",cart.items)
//   const orderId=generateOrderId()
//   const order = new Order({
//     orderId,  
//     userId,
//     orderedItems: cart.items.map(item => ({
//       product: {
//         productName: item.productId.productName,
//         _id: item.productId._id,
//         description: item.productId.description,
//         brand: item.productId.brand,
//         category: item.productId.category,
//         regularPrice: item.productId.regularPrice,
//         salePrice: item.productId.salePrice,
//         productOffer: item.productId.productOffer || 0,
//         quantity: item.productId.quantity,
//         color: item.productId.color,
//         productImage: item.productId.productImage,
//       },
//       quantity: item.quantity,
//       price: item.productId.salePrice,
//       cancellationStatus: 'active', 
//     })),
//     address: {
//       addressType: selectedAddress.addressType,
//       name: selectedAddress.name,
//       city: selectedAddress.city,
//       landMark: selectedAddress.landMark,
//       state: selectedAddress.state,
//       pincode: selectedAddress.pincode,
//       phone: selectedAddress.phone,
//       altPhone: selectedAddress.altPhone,
//     },
//     totalPrice: subtotal,
//     discount,
//     finalAmount: total,
//     paymentMethod,
//     couponApplied, 
//     status: 'Processing',
//     createdOn: new Date(), 
//     invoiceDate: new Date(), 
//   });

//   await order.save();

  
//   for (const item of cart.items) {
//     await Product.findByIdAndUpdate(item.productId._id, {
//       $inc: { quantity: -item.quantity },
//     });
//   }

  
//   await User.findByIdAndUpdate(userId, {
//     $push: { orderHistory: order._id },
//   });

  
//   await Cart.findOneAndUpdate(
//     { userId },
//     { $set: { items: [], discount: 0 } }
//   );

//   return res.status(200).json({ success: true, message: messages.ORDER_SUCCESS, orderId: order.orderId }); 

// });


const placeOrder = asyncHandler(async (req, res) => {
 
  const { addressId, paymentMethod, couponCode } = req.body;
  const userId = req.session.user;

  
  if (!addressId || !paymentMethod) {
    return res.status(400).json({ success: false, message: messages.REQUIRED_ADDRESS_PAYMENT });
  }

  
  if (!['cod', 'wallet', 'online payment'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: messages.INVALID_PAYMENT_METHOD });
  }

  
  const userAddress = await Address.findOne({ userId });
  if (!userAddress) {
    return res.status(404).json({ success: false, message: messages.NO_ADDRESS_FOUND });
  }
  const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
  if (!selectedAddress) {
    return res.status(404).json({ success: false, message: messages.ADDRESS_NOT_FOUND });
  }

  
  const cart = await Cart.findOne({ userId }).populate({ path: 'items.productId' });
  if (!cart || !cart.items.length) {
    return res.status(400).json({ success: false, message: messages.CART_EMPTY });
  }

  
  
  let subtotal = 0;
  cart.items.forEach(item => {
    subtotal += item.productId.salePrice * item.quantity;
  });
  

  // ✅ COUPON VALIDATION WITH EXPIRY CHECK
  let discount = 0;
  let couponApplied = false; 
  let validatedCoupon = null;
  
  if (couponCode) {
    console.log(`🎟️ Validating coupon: ${couponCode}`);
    
    const coupon = await Coupon.findOne({ name: couponCode, isActive: true });
    if (!coupon) {
      console.log(`❌ Coupon not found or inactive`);
      return res.status(400).json({ success: false, message: messages.INVALID_COUPON });
    }

    // ✅ FIX: Use currentDate in comparison
    const currentDate = new Date();
    console.log(`⏰ Current Date: ${currentDate}`);
    console.log(`📅 Coupon Expires: ${coupon.expireOn}`);
    
    // ✅ CRITICAL CHECK: Verify coupon hasn't expired
    if (currentDate > coupon.expireOn) {
      console.log(`❌ COUPON EXPIRED!`);
      
      // Clear discount from cart
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { discount: 0 } }
      );
      
      return res.status(400).json({ 
        success: false, 
        message: messages.COUPON_EXPIRED 
      });
    }
    console.log(`✅ Coupon is valid`);
    
    // Check minimum price
    if (subtotal < coupon.minimumPrice) {
      console.log(`❌ Minimum price not met`);
      return res.status(400).json({ 
        success: false, 
        message: messages.COUPON_MINIMUM(coupon.minimumPrice) 
      });
    }
   
    // Check if user already used this coupon
    if (coupon.userId && coupon.userId.includes(userId)) {
      console.log(`❌ User has already used this coupon`);
      return res.status(400).json({ 
        success: false, 
        message: "You have already used this coupon" 
      });
    }
    
    // Calculate discount
    if (coupon.discountPercentage) {
      discount = (subtotal * coupon.discountPercentage) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else if (coupon.offerPrice) {
      discount = coupon.offerPrice;
    }
    
    couponApplied = true; 
    validatedCoupon = coupon; // Store for marking as used later
    console.log(`✅ Coupon validated. Discount: ₹${discount}`);
  }

  
  const shippingCharge = subtotal < 500 ? 50 : 0; 
  const total = subtotal - discount + shippingCharge;
  console.log("📊 Final Total:", total);

  
  if (paymentMethod === 'cod' && total > 1000) {
    return res.status(400).json({
      success: false,
      message: messages.COD_LIMIT_EXCEEDED,
    }); 
  }
  
  const orderId = generateOrderId();
  const order = new Order({
    orderId,  
    userId,
    orderedItems: cart.items.map(item => ({
      product: {
        productName: item.productId.productName,
        _id: item.productId._id,
        description: item.productId.description,
        brand: item.productId.brand,
        category: item.productId.category,
        regularPrice: item.productId.regularPrice,
        salePrice: item.productId.salePrice,
        productOffer: item.productId.productOffer || 0,
        quantity: item.productId.quantity,
        color: item.productId.color,
        productImage: item.productId.productImage,
      },
      quantity: item.quantity,
      price: item.productId.salePrice,
      cancellationStatus: 'active', 
    })),
    address: {
      addressType: selectedAddress.addressType,
      name: selectedAddress.name,
      city: selectedAddress.city,
      landMark: selectedAddress.landMark,
      state: selectedAddress.state,
      pincode: selectedAddress.pincode,
      phone: selectedAddress.phone,
      altPhone: selectedAddress.altPhone,
    },
    totalPrice: subtotal,
    discount,
    finalAmount: total,
    paymentMethod,
    couponApplied, 
    status: 'Processing',
    createdOn: new Date(), 
    invoiceDate: new Date(), 
  });

  await order.save();
  console.log(`✅ Order created: ${orderId}`);

  // ✅ NEW: Mark coupon as used AFTER successful order creation
  if (validatedCoupon && couponApplied) {
    await Coupon.findByIdAndUpdate(
      validatedCoupon._id,
      { $addToSet: { userId: userId } } // $addToSet prevents duplicate entries
    );
    console.log(`✅ Coupon marked as used by user ${userId}`);
  }

  // Update product quantities
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.productId._id, {
      $inc: { quantity: -item.quantity },
    });
  }
  console.log(`✅ Product quantities updated`);

  // Update user order history
  await User.findByIdAndUpdate(userId, {
    $push: { orderHistory: order._id },
  });

  // Clear cart
  await Cart.findOneAndUpdate(
    { userId },
    { $set: { items: [], discount: 0 } }
  );
  console.log(`✅ Cart cleared`);

  return res.status(200).json({ 
    success: true, 
    message: messages.ORDER_SUCCESS, 
    orderId: order.orderId 
  }); 

});
  const orderConfirmation =asyncHandler(async (req,res)=>{
    
    
        const userId = req.session.user;
      

    const orderData = await User.findById(userId, { orderHistory: 1 }).populate(
      "orderHistory"
    );

    const data = orderData.orderHistory.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    console.log("data[0]",data[0])
    const orderId = data[0].orderId;

    res.render("user/orderConfirmation", { orderId: orderId });
    
  })


const getOrders = asyncHandler(async (req, res) => {
  
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const ITEMS_PER_PAGE = 4;

    const totalOrders = await Order.countDocuments({ userId });
    const orders = await Order.find({ userId })
      
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .sort({ createdOn: -1 });

    const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);
//console.log("ORDER IN FRONT end",orders)
    res.render("user/orders", {
      orders,
      currentPage: page,
      totalPages,
    });
  
});



const getOrderDetails = asyncHandler(async (req, res) => {
  
    const orderId = req.query.id;
    
    const order = await Order.findOne( {_id:orderId} )
      .populate('userId')
      .populate('orderedItems.product.category'); 
    

    if (!order) {
      return res.status(404).render("404", { message: messages.ORDER_NOT_FOUND });
    }

    res.render('user/order-view-details', {
      order
    });
  
});



const getInvoice = asyncHandler(async (req, res) => {
  
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).send(messages.ORDER_NOT_FOUND);
    }

  
    const order = await Order.findOne({ orderId }).lean();
    

    if (!order) {
      return res.status(400).send(messages.ORDER_NOT_FOUND);
    }

    const user = await User.findById(order.userId).lean();

    if (!order.invoiceDate) {
      const currentDate = new Date();
      await Order.updateOne({ orderId }, { $set: { invoiceDate: currentDate } });
      order.invoiceDate = currentDate;
    }

    res.render('user/invoice', { order, user });

 
});







const cancelOrder = asyncHandler(async (req, res) => {
  
    const { orderId, reason, otherReason } = req.body;
    const userId = req.session.user;

    if (!userId) return res.status(401).json({ success: false, error: messages.USER_NOT_AUTHENTICATED });
    if (!orderId) return res.status(400).json({ success: false, error: messages.ORDER_NOT_FOUND });
    if (!reason) return res.status(400).json({ success: false, error: messages.CANCEL_REASON_REQUIRED });
    if (reason === 'Other' && !otherReason) {
      return res.status(400).json({ success: false, error: messages.CANCEL_OTHER_REASON_REQUIRED });
    }

    const order = await Order.findOne({ orderId, userId });
    if (!order) return res.status(404).json({ success: false, error: messages.ORDER_NOT_FOUND });

    if (!['Pending', 'Processing'].includes(order.status)) {
      return res.status(400).json({ success: false, error: messages.ORDER_NOT_ELIGIBLE_CANCEL });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason === 'Other' ? otherReason : reason;
    order.cancelledAt = new Date();
    await order.save();

       
    let wallet = null;
    if (order.paymentMethod !== "cod") {
      
      wallet = await refundToWallet(order.userId, order.finalAmount, order._id, `Refund for cancelled order #${orderId}`);
    }

     
    for (const item of order.orderedItems) {
      await Product.findByIdAndUpdate(item.product._id, { $inc: { quantity: item.quantity } });
    }

    return res.status(200).json({
      success: true,
      message: messages.ORDER_CANCELLED_SUCCESS,
      wallet
    });
  
});



// const returnOrder = asyncHandler(async (req, res) => {
//   console.log("Inside returnOrder");
  
//     const { orderId, reason, otherReason } = req.body;
//     const userId = req.session.user;

//     //console.log("Request body:", req.body);
//     //console.log("USERID:", userId, "ORDERID:", orderId);

  
//     if (!userId) {
//       return res.status(401).json({ success: false, error: 'User not authenticated' });
//     }
//     if (!orderId) {
//       return res.status(400).json({ success: false, error: 'Order ID is required' });
//     }
//     if (!reason) {
//       return res.status(400).json({ success: false, error: 'Return reason is required' });
//     }
//     if (reason === 'Other' && !otherReason) {
//       return res.status(400).json({ success: false, error: 'Please specify the reason for return' });
//     }

    
//     const order = await Order.findById(orderId);
//     //console.log("ORDER:", order);
//     if (!order) {
//       return res.status(404).json({ success: false, error: 'Order not found' });
//     }

    
//     if (order.status !== 'delivered') {
//       return res.status(400).json({ success: false, error: 'Order is not eligible for return' });
//     }

    
//     const deliveryDate = order.updatedAt || order.createdOn;
//     const daysSinceDelivery = (new Date() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24);
//     if (daysSinceDelivery > 7) {
//       return res.status(400).json({ success: false, error: 'Return window has expired' });
//     }

    
//     order.status = 'return requested';
//     order.requestStatus='pending'
//     order.returnReason = reason === 'Other' ? otherReason : reason;
//     order.returnRequestedAt = new Date();
//     await order.save();
    
//     return res.status(200).json({ success: true, message: 'Return request submitted successfully' });
  
// });

const returnOrder = asyncHandler(async (req, res) => {
  const { orderId, reason, otherReason } = req.body;
  const userId = req.session.user;

  if (!userId) return res.status(401).json({ success: false, error: messages.USER_NOT_AUTHENTICATED });
  
  if (!orderId) return res.status(400).json({ success: false, error: messages.ORDER_NOT_FOUND });
  if (!reason) return res.status(400).json({ success: false, error: messages.RETURN_REASON_REQUIRED });
  if (reason === 'Other' && !otherReason) return res.status(400).json({ success: false, error: messages.RETURN_OTHER_REASON_REQUIRED });

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ success: false, error: messages.ORDER_NOT_FOUND });

  if (order.status !== 'delivered') return res.status(400).json({ success: false, error: messages.RETURN_NOT_ELIGIBLE });

  const deliveryDate = order.updatedAt || order.createdOn;
  const daysSinceDelivery = (new Date() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > 7) return res.status(400).json({ success: false, error: messages.RETURN_EXPIRED });

  // ✅ Set return request
  order.status = 'return requested';
  order.requestStatus = 'pending'; // pending until admin approves/rejects
  order.returnReason = reason === 'Other' ? otherReason : reason;
  order.returnRequestedAt = new Date();
  await order.save();

  return res.status(200).json({ success: true, message: 'Return request submitted successfully', order });
});

const applyCoupon = asyncHandler(async (req, res) => {
 
    
      const { couponCode, subtotal } = req.body;
      const userId = req.session.user;
           

      const coupon = await Coupon.findOne({ name: couponCode, isList: true });

      if (!coupon) {
        return res.status(400).json({ success: false, message: messages.INVALID_COUPON });
      }

      const now = new Date();
      if (now > coupon.expireOn) {
        return res.status(400).json({ success: false, message: messages.COUPON_EXPIRED });
      }

      if (subtotal < coupon.minimumPrice) {
        return res.status(400).json({ success: false, message: messages.COUPON_MINIMUM(coupon.minimumPrice) });
      }

      if (coupon.userId.includes(userId)) {
          return res.json({ success: false, message: "You have already used this coupon" });
      }

      let discount=0;
      if(coupon.offerPrice){
        discount=coupon.offerPrice;
      }else if(coupon.discountPercentage){
        discount=(subtotal*coupon.discountPercentage)/100;

        if(coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount)
          discount=coupon.maxDiscountAmount;
      }

    
      //await Coupon.updateOne({ _id: coupon._id }, { $push: { userId: userId } });

      await Cart.findOneAndUpdate({userId:userId},{$set:{discount:discount}},{new:true});

      res.json({ success: true, coupon });
  
});


const removeCoupon = asyncHandler(async (req, res) => {
  
      
     
      const userId = req.session.user;
     

      if (!userId ) {
        return res.status(400).json({ 
          success: false, 
          message: messages.INVALID_COUPON 
        });
      }

      
      await Cart.findOneAndUpdate(
          { userId: userId },
          { $set: { discount: 0} },
          {
            new:true
          }
      );

      
      

     
      res.json({ 
        success: true, 
        message: messages.COUPON_REMOVED 
      });
 
});


// const createOrder = asyncHandler(async (req, res, next) => {
 
//     const userId = req.session.user;
//     const { addressId, paymentMethod, couponCode } = req.body;

//     const cart = await Cart.findOne({ userId }).populate("items.productId");
//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: messages.CART_EMPTY_CHECKOUT });
//     }

    
//     for (let item of cart.items) {
//       const product = item.productId;
//       if (!product || product.isBlocked || product.quantity < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: messages.PRODUCT_UNAVAILABLE,
//         });
//       }
//     }


    
    
//     const subtotal = cart.items.reduce((acc, item) => acc + item.productId.salePrice * item.quantity, 0);
//     const shippingCharge = subtotal < 500 ? 50 : 0;
//     const discount = cart.discount || 0;
//     const finalAmount = subtotal - discount + shippingCharge;

//     const totalPrice = subtotal;

    
//     const addressData = await Address.findOne(
//       { userId, "address._id": addressId },
//       { "address.$": 1 }
//     ).lean();
//     console.log("ADDRESS DATA",addressData)
//     if (!addressData || !addressData.address || addressData.address.length === 0) {
//       return res.status(400).json({ success: false, message: messages.ADDRESS_NOT_FOUND_CHECKOUT });
//     }
//     const selectedAddress = addressData.address[0];

    
//     const orderedItems = cart.items.map(item => ({
//       product: {
//         _id: item.productId._id,
//         productName: item.productId.productName,
//         productImage: item.productId.productImage,
//         salePrice: item.productId.salePrice
//       },
//       quantity: item.quantity,
//       price: item.productId.salePrice * item.quantity
//     }));

//     let razorpayOrder = null;
//     if (paymentMethod === "online payment") {
//       const options = {
//         amount: finalAmount * 100,
//         currency: "INR",
//         receipt: `txn_${Date.now()}`
//       };
//       razorpayOrder = await razorpay.orders.create(options);
//     }

//      const orderId = generateOrderId();
//     const invoiceDate = new Date();

//     const order = new Order({
      
//       userId,
//       orderId,
//       orderedItems,
//       totalPrice,
//       finalAmount,
//       address: selectedAddress,
//       invoiceDate,
//       paymentMethod,
//       discount,
//       razorpayOrderId: razorpayOrder?.id || null,
//       paymentStatus: paymentMethod === "online payment" ? "Failed" : "Pending",
//       status: "Pending",
//       couponApplied: !!couponCode
//     });

//     await order.save();

    
//     if (couponCode) {
//       await Coupon.findOneAndUpdate(
//         { name: couponCode },
//         { $addToSet: { usedBy: userId } }
//       );
//     }

    
//    // await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });
//    await User.findByIdAndUpdate(
//     userId,
//     { $push: { orderHistory: order._id } },
//     { new: true }
//   );



    
//     await Cart.findOneAndUpdate({ userId }, { $set: { items: [], discount: 0 } });

//     return res.status(200).json({
//       success: true,
//       id: razorpayOrder?.id || null,
//       amount: finalAmount * 100,
//       currency: "INR"
//     });

  
// });



  

// const verifyPayment = asyncHandler(async (req, res, next) => {
 
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    
//     const order = await Order.findOne({ razorpayOrderId: razorpay_order_id })

        
//     if (!order) {
//       return res.status(404).json({ success: false, message: messages.ORDER_NOT_FOUND });
//     }
//     if (order.paymentStatus === "Success") {
//       return res.status(200).json({ success: true, message: messages.PAYMENT_SUCCESS });
//     }
  
    
//     if (!razorpay_signature) {
//       await Order.updateOne(
//         { razorpayOrderId: razorpay_order_id },
//         { $set: { status: "Pending", paymentStatus: "Failed" } }
//       );
//       return res.status(400).json({ success: false, message: messages.PAYMENT_SIGNATURE_MISSING });
//     }

    
//     const generatedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (generatedSignature !== razorpay_signature) {
//       await Order.updateOne(
//         { razorpayOrderId: razorpay_order_id },
//         { $set: { status: "Pending", paymentStatus: "Failed" } }
//       );
//       return res.status(400).json({ success: false, message: messages.PAYMENT_SIGNATURE_INVALID });
//     }

    
//     await Order.updateOne(
//       { razorpayOrderId: razorpay_order_id },
//       { $set: { status: "Processing", paymentStatus: "Success" } }
//     );

    
//     const orderedItems = order.orderedItems || [];
//     for (let i = 0; i < orderedItems.length; i++) {
//       const productId = orderedItems[i].product?._id;
//       const quantity = orderedItems[i].quantity;

//       if (productId) {
//         await Product.findByIdAndUpdate(productId, {
//           $inc: { quantity: -quantity },
//         });
//       }
//     }

//     res.status(200).json({
//       success: true,
//       message: PAYMENT_SUCCESS,
//       orderId:order.orderId
//     });

  
// });

const createOrder = asyncHandler(async (req, res, next) => {
 
  const userId = req.session.user;
  const { addressId, paymentMethod, couponCode } = req.body;

  console.log("=" .repeat(50));
  console.log("🛒 CREATE ORDER (ONLINE PAYMENT) STARTED");
  console.log("Coupon Code:", couponCode);
  console.log("User ID:", userId);
  console.log("=" .repeat(50));

  const cart = await Cart.findOne({ userId }).populate("items.productId");
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: messages.CART_EMPTY_CHECKOUT });
  }

  // Validate products
  for (let item of cart.items) {
    const product = item.productId;
    if (!product || product.isBlocked || product.quantity < item.quantity) {
      return res.status(400).json({
        success: false,
        message: messages.PRODUCT_UNAVAILABLE,
      });
    }
  }

  // Calculate subtotal
  const subtotal = cart.items.reduce((acc, item) => acc + item.productId.salePrice * item.quantity, 0);
  const shippingCharge = subtotal < 500 ? 50 : 0;
  
  // ✅ COUPON VALIDATION WITH EXPIRY CHECK
  let discount = 0;
  let validatedCoupon = null;
  let couponApplied = false;

  if (couponCode) {
    console.log("\n🎟️  COUPON VALIDATION START");
    console.log("Coupon Code:", couponCode);
    
    // Fetch coupon from database
    const coupon = await Coupon.findOne({ name: couponCode, isActive: true });
    
    if (!coupon) {
      console.log("❌ Coupon not found or inactive");
      return res.status(400).json({ 
        success: false, 
        message: messages.INVALID_COUPON 
      });
    }

    console.log("\n📄 COUPON DETAILS:");
    console.log("   Name:", coupon.name);
    console.log("   Active:", coupon.isActive);
    console.log("   Expire On:", coupon.expireOn);
    console.log("   Min Price:", coupon.minimumPrice);
    console.log("   Discount %:", coupon.discountPercentage);
    console.log("   Offer Price:", coupon.offerPrice);
    console.log("   Used By:", coupon.userId);

    // ✅ CRITICAL: Check if coupon is expired
    const currentDate = new Date();
    console.log("\n⏰ DATE COMPARISON:");
    console.log("   Current Date:", currentDate);
    console.log("   Current ISO:", currentDate.toISOString());
    console.log("   Coupon Expires:", coupon.expireOn);
    console.log("   Expires ISO:", new Date(coupon.expireOn).toISOString());
    console.log("   Current (ms):", currentDate.getTime());
    console.log("   Expiry (ms):", new Date(coupon.expireOn).getTime());
    console.log("   Is Expired?:", currentDate > coupon.expireOn);
    
    if (currentDate > coupon.expireOn) {
      console.log("\n❌❌❌ COUPON IS EXPIRED! ❌❌❌");
      console.log("Clearing cart discount...");
      
      // Clear discount from cart
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { discount: 0 } }
      );
      
      console.log("✅ Cart discount cleared");
      return res.status(400).json({ 
        success: false, 
        message: messages.COUPON_EXPIRED 
      });
    }
    
    console.log("✅ Coupon is NOT expired - proceeding");

    // Check minimum price
    console.log("\n💰 PRICE VALIDATION:");
    console.log("   Subtotal:", subtotal);
    console.log("   Minimum Required:", coupon.minimumPrice);
    
    if (subtotal < coupon.minimumPrice) {
      console.log("❌ Minimum price not met");
      return res.status(400).json({ 
        success: false, 
        message: messages.COUPON_MINIMUM(coupon.minimumPrice) 
      });
    }
    console.log("✅ Minimum price met");

    // Check if already used
    console.log("\n👤 USER USAGE CHECK:");
    console.log("   User ID:", userId);
    console.log("   Coupon Used By:", coupon.userId);
    
    if (coupon.userId && coupon.userId.includes(userId)) {
      console.log("❌ User already used this coupon");
      return res.status(400).json({ 
        success: false, 
        message: "You have already used this coupon" 
      });
    }
    console.log("✅ User hasn't used this coupon");

    // Calculate discount
    console.log("\n💵 DISCOUNT CALCULATION:");
    if (coupon.discountPercentage) {
      discount = (subtotal * coupon.discountPercentage) / 100;
      console.log("   Type: Percentage");
      console.log("   Rate:", coupon.discountPercentage + "%");
      console.log("   Calculated:", discount);
      
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        console.log("   Max Cap:", coupon.maxDiscountAmount);
        discount = coupon.maxDiscountAmount;
        console.log("   Final (capped):", discount);
      }
    } else if (coupon.offerPrice) {
      discount = coupon.offerPrice;
      console.log("   Type: Fixed");
      console.log("   Amount:", discount);
    }

    couponApplied = true;
    validatedCoupon = coupon;
    console.log("\n✅✅✅ COUPON VALIDATION PASSED ✅✅✅");
    console.log("Final Discount: ₹" + discount);
  } else {
    console.log("\nℹ️  No coupon code provided");
    // If no coupon code but cart has discount, clear it
    if (cart.discount > 0) {
      console.log("⚠️  Cart has old discount, clearing it");
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { discount: 0 } }
      );
    }
  }

  const finalAmount = subtotal - discount + shippingCharge;
  const totalPrice = subtotal;

  console.log("\n📊 ORDER SUMMARY:");
  console.log("   Subtotal: ₹" + subtotal);
  console.log("   Discount: ₹" + discount);
  console.log("   Shipping: ₹" + shippingCharge);
  console.log("   FINAL AMOUNT: ₹" + finalAmount);

  // Get address
  const addressData = await Address.findOne(
    { userId, "address._id": addressId },
    { "address.$": 1 }
  ).lean();
  
  console.log("\n📍 ADDRESS DATA:", addressData ? "Found ✅" : "Not Found ❌");
  
  if (!addressData || !addressData.address || addressData.address.length === 0) {
    return res.status(400).json({ success: false, message: messages.ADDRESS_NOT_FOUND_CHECKOUT });
  }
  const selectedAddress = addressData.address[0];

  // Prepare ordered items
  const orderedItems = cart.items.map(item => ({
    product: {
      _id: item.productId._id,
      productName: item.productId.productName,
      productImage: item.productId.productImage,
      salePrice: item.productId.salePrice
    },
    quantity: item.quantity,
    price: item.productId.salePrice * item.quantity
  }));

  // Create Razorpay order
  let razorpayOrder = null;
  if (paymentMethod === "online payment") {
    console.log("\n💳 Creating Razorpay order...");
    const options = {
      amount: finalAmount * 100,
      currency: "INR",
      receipt: `txn_${Date.now()}`
    };
    razorpayOrder = await razorpay.orders.create(options);
    console.log("✅ Razorpay Order ID:", razorpayOrder.id);
  }

  const orderId = generateOrderId();
  const invoiceDate = new Date();

  console.log("\n📝 Creating order in database...");
  console.log("   Order ID:", orderId);

  const order = new Order({
    userId,
    orderId,
    orderedItems,
    totalPrice,
    finalAmount,
    address: selectedAddress,
    invoiceDate,
    paymentMethod,
    discount,
    razorpayOrderId: razorpayOrder?.id || null,
    paymentStatus: paymentMethod === "online payment" ? "Failed" : "Pending",
    status: "Pending",
    couponApplied: couponApplied
  });

  await order.save();
  console.log("✅ Order saved to database");

  // Mark coupon as used (only if validated)
  if (couponCode && validatedCoupon && couponApplied) {
    console.log("\n🎟️  Marking coupon as used...");
    await Coupon.findOneAndUpdate(
      { name: couponCode },
      { $addToSet: { userId: userId } } // Changed from usedBy to userId
    );
    console.log("✅ Coupon marked as used");
  }

  // Update user order history
  await User.findByIdAndUpdate(
    userId,
    { $push: { orderHistory: order._id } },
    { new: true }
  );
  console.log("✅ User order history updated");

  // Clear cart
  await Cart.findOneAndUpdate({ userId }, { $set: { items: [], discount: 0 } });
  console.log("✅ Cart cleared");

  console.log("\n✅✅✅ CREATE ORDER COMPLETED SUCCESSFULLY ✅✅✅");
  console.log("=" .repeat(50) + "\n");

  return res.status(200).json({
    success: true,
    id: razorpayOrder?.id || null,
    amount: finalAmount * 100,
    currency: "INR"
  });


});
const verifyPayment = asyncHandler(async (req, res, next) => {
 
  console.log("=== VERIFY PAYMENT START ===");
  console.log("Request body:", req.body);
  
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

  console.log("razorpay_order_id:", razorpay_order_id);
  console.log("razorpay_payment_id:", razorpay_payment_id);
  console.log("razorpay_signature:", razorpay_signature);
  
  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
  console.log("Order found:", order ? "YES" : "NO");
  console.log("Order ID:", order?.orderId);
      
  if (!order) {
    console.log("ERROR: Order not found");
    return res.status(404).json({ 
      success: false, 
      message: messages.ORDER_NOT_FOUND
    });
  }
  
  if (order.paymentStatus === "Success") {
    console.log("Payment already successful");
    return res.status(200).json({ 
      success: true, 
      message: messages.PAYMENT_SUCCESS,
      orderId: order.orderId
    });
  }

  if (!razorpay_signature) {
    console.log("ERROR: Signature missing");
    await Order.updateOne(
      { razorpayOrderId: razorpay_order_id },
      { $set: { status: "Pending", paymentStatus: "Failed" } }
    );
    return res.status(400).json({ 
      success: false, 
      message: messages.PAYMENT_SIGNATURE_MISSING
    });
  }

  console.log("Generating signature...");
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  console.log("Generated signature:", generatedSignature);
  console.log("Received signature:", razorpay_signature);
  console.log("Signatures match:", generatedSignature === razorpay_signature);

  if (generatedSignature !== razorpay_signature) {
    console.log("ERROR: Signature mismatch");
    await Order.updateOne(
      { razorpayOrderId: razorpay_order_id },
      { $set: { status: "Pending", paymentStatus: "Failed" } }
    );
    return res.status(400).json({ 
      success: false, 
      message: messages.PAYMENT_SIGNATURE_INVALID
    });
  }

  console.log("Updating order status...");
  await Order.updateOne(
    { razorpayOrderId: razorpay_order_id },
    { $set: { status: "Processing", paymentStatus: "Success" } }
  );

  console.log("Updating product quantities...");
  const orderedItems = order.orderedItems || [];
  for (let i = 0; i < orderedItems.length; i++) {
    const productId = orderedItems[i].product?._id;
    const quantity = orderedItems[i].quantity;

    if (productId) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { quantity: -quantity },
      });
    }
  }

  console.log("Payment verification SUCCESS");
  console.log("Returning orderId:", order.orderId);
  
  res.status(200).json({
    success: true,
    message: messages.PAYMENT_SUCCESS,
    orderId: order.orderId
  });

  console.log("=== VERIFY PAYMENT END ===");
});
const placeWalletOrder=asyncHandler(async(req,res)=>{
  
    const { addressId, paymentMethod, couponCode } = req.body;
    const userId = req.session.user;
   
    const userAddress = await Address.findOne({ userId });
    const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
    
    
    const cart = await Cart.findOne({ userId }).populate({
      path:"items.productId"
    });

    let discount=cart.discount;
  const cartItems=cart.items;
    let subtotal = 0;
    cartItems.forEach(item => subtotal += item.productId.salePrice * item.quantity);
    const shippingCharge = subtotal < 500 ? 50 : 0;
    const total = subtotal - (discount || 0) + shippingCharge;

    let wallet = await Wallet.findOne({ userId: userId });

    if (wallet.balance < total) {
      return res.status(400).json({
        success: false,
        message: "Insufficient  Amount",
      });
      
    }

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: WALLET_NOT_FOUND,
      });
      
    }
  

const orderId=generateOrderId()
    const order = new Order({

      userId,
      orderId,

      orderedItems: cartItems.map(item => ({
        
        product: item.productId,
        quantity: item.quantity,
        price: item.productId.salePrice,
        totalPrice: item.productId.salePrice * item.quantity
      })),
      address: selectedAddress,
      paymentMethod,
      totalPrice:subtotal,
      discount: discount || 0,
      shippingCharge,
      finalAmount:total,
      status: 'Processing'
    });

    await order.save();

    wallet.balance -= parseInt(total);
    wallet.transactions.push({
      amount:total,
      type: "debit",
      description: "Deducted for purchase",
      orderId:order._id,
    });
    await wallet.save();

    for(const item of cartItems){
      await Product.findByIdAndUpdate(
      item.productId._id,
      {$inc:{quantity:-item.quantity}}
      );
    }

    await User.findByIdAndUpdate(
      userId,
      { $push: { orderHistory: order._id } },
      { new: true }
    );


      await Cart.findOneAndUpdate({userId},{$set:{items:[]}})
   return res.status(200).json({ success: true, message:messages.ORDER_SUCCESS });


  
})





// const cancelOrderItem = asyncHandler(async (req, res) => {
  
//     const { orderId, itemId, reason, otherReason } = req.body;

//     if (!orderId || !itemId || !reason) {
//       return res.status(400).json({ success: false, message: "Missing required fields" });
//     }

//     const order = await Order.findOne({ orderId });

//     console.log("ORDER.Status",order.status)
//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     if (!["Pending", "Processing"].includes(order.status)) {
//       return res.status(400).json({ success: false, message: "Order cannot be modified" });
//     }

//     const itemIndex = order.orderedItems.findIndex(
//       (item) => item.product && item.product._id && item.product._id.toString() === itemId
//     );
  
//     if (itemIndex === -1) {
//       return res.status(404).json({ success: false, message: "Item not found in order" });
//     }

//     const item = order.orderedItems[itemIndex];
//     if (item.cancellationStatus === "cancelled") {
//       return res.status(400).json({ success: false, message: "Item already cancelled" });
//     }

    
//     item.cancellationStatus = "cancelled";
//     item.cancellationReason = reason === "Other" ? otherReason : reason;
//     item.cancelledAt = new Date();

//     const itemTotal = item.price *item.quantity;

    
//     order.totalPrice -= itemTotal;
//     order.finalAmount = Math.max(0, order.totalPrice - (order.discount || 0));

    
//     const allItemsCancelled = order.orderedItems.every(itm => itm.cancellationStatus === "cancelled");
//     if (allItemsCancelled) {
//       order.status = "cancelled";
//       order.cancellationReason = "All items cancelled";
//       order.cancelledAt = new Date();
//     }

    
//     let wallet = null;
//     if (order.paymentMethod !== "cod" && itemTotal > 0) {
//       wallet = await refundToWallet(order.userId, itemTotal, order._id, `Refund for cancelled item in order #${orderId}`);
//     }

    
//     const product = await Product.findById(itemId);
//     if (product) {
//       product.quantity += item.quantity;
//       await product.save();
//     }

//     await order.save();

//     return res.json({
//       success: true,
//       message: "Item cancelled successfully",
//       refundAmount: itemTotal,
//       order: {
//         orderId: order.orderId,
//         totalPrice: order.totalPrice,
//         finalAmount: order.finalAmount,
//         status: order.status,
//       },
//       wallet
//     });
  
// });


const cancelOrderItem = asyncHandler(async (req, res) => {
  const { orderId, itemId, reason, otherReason } = req.body;

  if (!orderId || !itemId || !reason) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const order = await Order.findOne({ orderId });
  console.log("ORDER.Status", order?.status);

  if (!order) return res.status(404).json({ success: false, message: "Order not found" });

  if (!["Pending", "Processing"].includes(order.status)) {
    return res.status(400).json({ success: false, message: "Order cannot be modified" });
  }

  const itemIndex = order.orderedItems.findIndex(
    (item) =>
      item.product &&
      item.product._id &&
      item.product._id.toString() === itemId
  );

  if (itemIndex === -1) {
    return res.status(404).json({ success: false, message: "Item not found in order" });
  }

  const item = order.orderedItems[itemIndex];
  if (item.cancellationStatus === "cancelled") {
    return res.status(400).json({ success: false, message: "Item already cancelled" });
  }

  
  const grossOrderTotal = order.orderedItems.reduce((sum, it) => {
    if (it.cancellationStatus !== "cancelled") {
      return sum + (it.price * it.quantity);
    }
    return sum;
  }, 0);

  const itemGross = item.price * item.quantity;
  const itemShare = grossOrderTotal > 0 ? itemGross / grossOrderTotal : 0;
  const itemDiscount = +(itemShare * (order.discount || 0)).toFixed(2);
  const itemNetPaid = +(itemGross - itemDiscount).toFixed(2); 

  
  item.cancellationStatus = "cancelled";
  item.cancellationReason = reason === "Other" ? otherReason : reason;
  item.cancelledAt = new Date();

  
  order.totalPrice = +(order.totalPrice - itemGross).toFixed(2);
  order.discount = +(order.discount - itemDiscount).toFixed(2);
  order.finalAmount = Math.max(0, +(order.finalAmount - itemNetPaid).toFixed(2));

  
  const allItemsCancelled = order.orderedItems.every(
    (itm) => itm.cancellationStatus === "cancelled"
  );
  if (allItemsCancelled) {
    order.status = "cancelled";
    order.cancellationReason = "All items cancelled";
    order.cancelledAt = new Date();
  }

  
  let wallet = null;
  if (order.paymentMethod !== "cod" && itemNetPaid > 0) {
    wallet = await refundToWallet(
      order.userId,
      itemNetPaid,
      order._id,
      `Refund for cancelled item in order #${orderId}`
    );
  }

  
  const product = await Product.findById(itemId);
  if (product) {
    product.quantity += item.quantity;
    await product.save();
  }

  await order.save();

  return res.json({
    success: true,
    message: "Item cancelled successfully",
    refundAmount: itemNetPaid,
    order: {
      orderId: order.orderId,
      totalPrice: order.totalPrice,
      discount: order.discount,
      finalAmount: order.finalAmount,
      status: order.status,
    },
    wallet,
  });
});


const paymentFailure=asyncHandler(async(req,res)=>{
  
    const orderId = req.query.orderId;
   // console.log("Request Query:", req.query);

   // console.log("ORDERIDDDDDD",orderId)

    const orderData = await Order.findOne({ razorpayOrderId: orderId });

   // console.log("ORDERDATA",orderData)
    res.render("user/paymentFailure", { order: orderData });
  
})




  

const loadRetryPayment = asyncHandler(async (req, res, next) => {

    const userId = req.session.user;
    const orderId = req.query.id; 
    console.log("FROM RETRY",req.query.id)

    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).render('error', {
        message: 'User not found or not authenticated',
        status: 401,
      });
    }

   
    if (!orderId) {
      return res.status(400).render('error', {
        message: 'Order ID is required',
        status: 400,
      });
    }

   // const orderData = await Order.findOne({ razorpayOrderId: orderId });
    
    const orderData = await Order.findOne({orderId:orderId})
    console.log("ORDERDATA",orderData)
    if (!orderData) {
      return res.status(404).render('error', {
        message: 'Order not found',
        status: 404,
      });
    }

    
    if (orderData.status.toLowerCase() !== 'pending') {
      return res.status(400).render('error', {
        message: 'Retry payment is only available for pending orders',
        status: 400,
      });
    }

    
    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = new Wallet({ userId: user._id, balance: 0, transactions: [] });
      await wallet.save(); 
    }

    
    res.render('user/retryPayment', { user, order: orderData, wallet });
  
});


const retryPaymentCod = asyncHandler(async (req, res, next) => {
 
    const orderId = req.query.orderId;
    const orderData = await Order.findOne({ orderId: orderId });
    console.log("ORDERDATA",orderData)

    if (!orderData) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Order not found." });
    }

    
    if (orderData.finalAmount > 1000) {
      return res
        .status(StatusCodes.BAD_REQUEST)   
        .json({ success: false, message: Messages.COD_LIMIT_EXCEEDED });
    }

    
    const orderedItems = orderData.orderedItems;

    
    for (let item of orderedItems) {
      const productId = item.product._id;
      const quantityNeeded = item.quantity;

      const product = await Product.findById(productId);
      if (!product || product.isBlocked || product.quantity < quantityNeeded) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: Messages.INSUFFICIENT_STOCK(
            product?.productName || 'Unknown',
            product?.quantity ?? 0
          ),
        });
      }
    }

    
    for (let item of orderedItems) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { quantity: -item.quantity },
      });
    }

    
    const updateOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      {
        $set: {
          status: "Processing",
          paymentStatus: "Pending",
          paymentMethod: "cod",
        },
      },
      { new: true }
    );

    if (updateOrder) {
      return res
        .status(200)
        .json({ success: true, message: "PAYMENT_SUCCESSFUL" });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Payment Failed"});
    }
 
});


const retryPaymentWallet = asyncHandler(async (req, res) => {
  
    const userId = req.session.user;
    const orderId = req.query.orderId;
    const orderData = await Order.findOne({ orderId });
    const userData = await User.findById(userId);
    let wallet = await Wallet.findOne({ userId });

    if (!orderData) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "Wallet Not Found",
      });
    }

    const finalAmount = orderData.finalAmount;

    if (wallet.balance < finalAmount) {
      return res.status(400).json({
        success: false,
        message: Messages.INSUFFICIENT_WALLET_BALANCE(wallet.balance),
      });
    }

    
    for (let item of orderData.orderedItems) {
      const product = await Product.findById(item.product._id);
      if (!product || product.isBlocked || product.quantity < item.quantity) {
        return res.status(400).json({
          status: false,
          message: Messages.INSUFFICIENT_STOCK(product?.productName || 'Unknown', product?.quantity ?? 0),
        });
      }
    }

    
    wallet.balance -= parseInt(finalAmount);
    wallet.transactions.push({
      amount: finalAmount,
      type: "debit",
      description: "Deducted for purchase",
      orderId: orderData._id,
    });
    await wallet.save();

    
    for (let item of orderData.orderedItems) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { quantity: -item.quantity },
      });
    }

    
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId },
      {
        $set: {
          status: "Processing",
          paymentStatus: "Success",
          paymentMethod: "wallet",
        },
      },
      { new: true }
    );

    if (updatedOrder) {
      return res.status(200).json({
        success: true,
        message: "PAYMENT_SUCCESSFUL",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "PAYMENT_FAILED",
      });
    }
  
});


const retryPaymentOnline = asyncHandler(async (req, res, next) => {
  
    const userId = req.session.user;
    const { orderId } = req.body;
    
    
    const orderData = await Order.findOne({ orderId });

    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    
    const amount = parseInt(orderData.finalAmount);
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order amount",
      });
    }

    
    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `txn_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    
    await Order.findOneAndUpdate(
      { orderId },
      { $set: { razorpayOrderId: razorpayOrder.id } }
    );

    //console.log("ORDER DATA:",orderData)
    //console.log("OPTIONS:",options)
    return res.status(200).json({
      success: true,
      message: "Razorpay order created",
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: options.amount,
        currency: options.currency,
        orderId: orderData.orderId,
      },
    });
  
});



const retryVerifyPayment = asyncHandler(async (req, res) => {
  
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;
    console.log("RAZORID:",req.body)
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
   
    if (!razorpay_signature) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { $set: { status: "Pending", paymentStatus: "Failed" } }
      );
      return res.status(200).json({ success: false, message: "Signature missing" });
    }
    console.log("PAYMENT SUCCCCESSSSSS")
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { $set: { status: "Pending", paymentStatus: "Failed" } }
      );
      return res.status(200).json({ success: false, message: "Signature mismatch" });
    }

    
    await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        $set: {
          status: "Processing",
          paymentStatus: "Success",
        },
      }
    );

    
    
    const orderedItems = order.orderedItems;
    for (let item of orderedItems) {
      const productId = item.product._id;
      const quantityToDeduct = item.quantity;

      await Product.findByIdAndUpdate(
        productId,
        { $inc: { quantity: -quantityToDeduct } }
      );
    }

   

    res.status(200).json({
      success: true,
      message: "Payment verified and order updated successfully",
    });
  
});

const searchOrder=asyncHandler(async(req,res)=>{
  
    const userId=req.session.user
    const userData=await User.findById(userId)
    const search=req.body.orderId
    const order=await Order.find({orderId:search})
    if(order){

      res.render("user/orders", {
        orders:order,
        currentPage: 0,
        totalPages:0,
      });

    }else{
      res.render("user/orders", {
        orders:{},
        currentPage: 0,
        totalPages:0,
      });
    }
  
})



  module.exports ={
    placeOrder,
    orderConfirmation,
    getOrders,
    getOrderDetails,
    getInvoice,
    cancelOrder,
    returnOrder,
    applyCoupon,
    removeCoupon,
    createOrder,
    verifyPayment,
    placeWalletOrder,
    cancelOrderItem,
    loadRetryPayment,
    paymentFailure,
    retryPaymentCod,
    retryPaymentWallet,
    retryPaymentOnline,
    retryVerifyPayment,
    searchOrder

  }