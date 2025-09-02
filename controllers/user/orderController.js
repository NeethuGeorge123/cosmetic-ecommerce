
const Product= require("../../models/productSchema")
const Category= require("../../models/categorySchema");
const User = require("../../models/userSignupSchema")
const Cart=require("../../models/cartSchema")
const Address=require("../../models/addressSchema")
const Order=require("../../models/orderSchema")
const Coupon=require("../../models/couponSchema")
const razorpay=require("../../config/razorpay")

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
  
const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod, couponCode } = req.body;
    const userId = req.session.user;

    
    if (!addressId || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Address and payment method are required' }); 
    }

    
    if (!['cod', 'wallet', 'online payment'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' }); 
    }

    
    const userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      return res.status(404).json({ success: false, message: 'No addresses found for user' }); 
    }
    const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
    if (!selectedAddress) {
      return res.status(404).json({ success: false, message: 'Selected address not found' }); 
    }

    
    const cart = await Cart.findOne({ userId }).populate({ path: 'items.productId' });
    if (!cart || !cart.items.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty' }); 
    }

    
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.productId.salePrice * item.quantity;
    });
    

    
    let discount = 0;
    let couponApplied = false; 
    if (couponCode) {
      const coupon = await Coupon.findOne({ name: couponCode, isActive: true });
      if (!coupon) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive coupon' }); 
      }
      if (subtotal < coupon.minimumPrice) {
        return res.status(400).json({ success: false, message: `Minimum order amount for this coupon is ₹${coupon.minimumPrice}` }); 
      }
      if (coupon.expireOn < new Date()) {
        return res.status(400).json({ success: false, message: 'Coupon has expired' }); 
      }
      if (coupon.discountPercentage) {
        discount = (subtotal * coupon.discountPercentage) / 100;
        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
          discount = coupon.maxDiscountAmount;
        }
      } else if (coupon.offerPrice) {
        discount = coupon.offerPrice;
      }
      couponApplied = true; 
    }

    
    const shippingCharge = subtotal < 500 ? 50 : 0; 
    
    const total = subtotal - discount + shippingCharge;
    console.log("SUBTOTAL:",total)

    
    if (paymentMethod === 'cod' && total > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Cash on Delivery is not allowed for orders above ₹1000',
      }); 
    }
    //console.log("CATEGORYYY:",cart.items)
    const orderId=generateOrderId()
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

    
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.productId._id, {
        $inc: { quantity: -item.quantity },
      });
    }

    
    await User.findByIdAndUpdate(userId, {
      $push: { orderHistory: order._id },
    });

    
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [], discount: 0 } }
    );

    return res.status(200).json({ success: true, message: 'Order placed successfully', orderId: order.orderId }); 
  } catch (error) {
    console.error('Error in placeOrder:', error);
    return res.status(500).json({ success: false, message: 'Order placement failed' });   
  }
};


  const orderConfirmation = async (req,res)=>{
    try {
    
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
    } catch (error) {
        console.error(error)
    }
  }


const getOrders = async (req, res) => {
  try {
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
  } catch (error) {
    console.log("Error loading orders:", error);
    res.status(500).send("Server error");
  }
};



const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.query.id;
    
    const order = await Order.findOne( {_id:orderId} )
      .populate('userId')
      .populate('orderedItems.product.category'); 
    

    if (!order) {
      return res.status(404).render('404', { message: 'Order not found' });
    }

    res.render('user/order-view-details', {
      order
    });
  } catch (err) {
    console.error('Error fetching order details:', err);
    
  }
};



const getInvoice = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).send('Missing orderId in query');
    }

  
    const order = await Order.findOne({ orderId }).lean();
    

    if (!order) {
      return res.status(400).send('Order not found');
    }

    const user = await User.findById(order.userId).lean();

    if (!order.invoiceDate) {
      const currentDate = new Date();
      await Order.updateOne({ orderId }, { $set: { invoiceDate: currentDate } });
      order.invoiceDate = currentDate;
    }

    res.render('user/invoice', { order, user });

  } catch (error) {
    console.error('Error rendering invoice:', error);
    res.status(500).send('Server Error');
  }
};







const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason, otherReason } = req.body;
    const userId = req.session.user;

    if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });
    if (!orderId) return res.status(400).json({ success: false, error: 'Order ID is required' });
    if (!reason) return res.status(400).json({ success: false, error: 'Cancellation reason is required' });
    if (reason === 'Other' && !otherReason) {
      return res.status(400).json({ success: false, error: 'Please specify the reason for cancellation' });
    }

    const order = await Order.findOne({ orderId, userId });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (!['Pending', 'Processing'].includes(order.status)) {
      return res.status(400).json({ success: false, error: 'Order cannot be cancelled' });
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
      message: 'Order cancelled successfully',
      wallet
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};



const returnOrder = async (req, res) => {
  console.log("Inside returnOrder");
  try {
    const { orderId, reason, otherReason } = req.body;
    const userId = req.session.user;

    //console.log("Request body:", req.body);
    //console.log("USERID:", userId, "ORDERID:", orderId);

  
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Return reason is required' });
    }
    if (reason === 'Other' && !otherReason) {
      return res.status(400).json({ success: false, error: 'Please specify the reason for return' });
    }

    
    const order = await Order.findById(orderId);
    //console.log("ORDER:", order);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    
    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, error: 'Order is not eligible for return' });
    }

    
    const deliveryDate = order.updatedAt || order.createdOn;
    const daysSinceDelivery = (new Date() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 7) {
      return res.status(400).json({ success: false, error: 'Return window has expired' });
    }

    
    order.status = 'return requested';
    order.requestStatus='pending'
    order.returnReason = reason === 'Other' ? otherReason : reason;
    order.returnRequestedAt = new Date();
    await order.save();
    
    return res.status(200).json({ success: true, message: 'Return request submitted successfully' });
  } catch (error) {
    console.error('Error processing return:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};


const applyCoupon = async (req, res) => {
  try {
    
      const { couponCode, subtotal } = req.body;
      const userId = req.session.user;
           

      const coupon = await Coupon.findOne({ name: couponCode, isList: true });

      if (!coupon) {
          return res.json({ success: false, message: "Invalid or expired coupon" });
      }

      const now = new Date();
      if (now > coupon.expireOn) {
          return res.json({ success: false, message: "This coupon has expired" });
      }

      if (subtotal < coupon.minimumPrice) {
          return res.json({ success: false, message: `Minimum order should be ₹${coupon.minimumPrice}` });
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
  } catch (error) {
      console.error('Error applying coupon:', error);
      res.status(500).json({ success: false, message: "Server error" });
  }
};


const removeCoupon = async (req, res) => {
  try {
      
     
      const userId = req.session.user;
     

      if (!userId ) {
          return res.status(400).json({ success: false, message: 'No coupon found in session or user not logged in' });
      }

      
      await Cart.findOneAndUpdate(
          { userId: userId },
          { $set: { discount: 0} },
          {
            new:true
          }
      );

      
      

     
      res.json({ success: true,message:"Coupon removed successfully" });
  } catch (error) {
      console.error('Error removing coupon:', error);
      res.status(500).json({ success: false });
  }
};


const createOrder = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const { addressId, paymentMethod, couponCode } = req.body;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty." });
    }

    
    for (let item of cart.items) {
      const product = item.productId;
      if (!product || product.isBlocked || product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Some products are unavailable or out of stock.",
        });
      }
    }

    
    const subtotal = cart.items.reduce((acc, item) => acc + item.productId.salePrice * item.quantity, 0);
    const shippingCharge = subtotal < 500 ? 50 : 0;
    const discount = cart.discount || 0;
    const finalAmount = subtotal - discount + shippingCharge;

    const totalPrice = subtotal;

    
    const addressData = await Address.findOne(
      { userId, "address._id": addressId },
      { "address.$": 1 }
    ).lean();
    console.log("ADDRESS DATA",addressData)
    if (!addressData || !addressData.address || addressData.address.length === 0) {
      return res.status(400).json({ success: false, message: "Address not found." });
    }
    const selectedAddress = addressData.address[0];

    
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

    let razorpayOrder = null;
    if (paymentMethod === "online payment") {
      const options = {
        amount: finalAmount * 100,
        currency: "INR",
        receipt: `txn_${Date.now()}`
      };
      razorpayOrder = await razorpay.orders.create(options);
    }

     const orderId = generateOrderId();
    const invoiceDate = new Date();

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
      couponApplied: !!couponCode
    });

    await order.save();

    
    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { name: couponCode },
        { $addToSet: { usedBy: userId } }
      );
    }

    
   // await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });
   await User.findByIdAndUpdate(
    userId,
    { $push: { orderHistory: order._id } },
    { new: true }
  );



    
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [], discount: 0 } });

    return res.status(200).json({
      success: true,
      id: razorpayOrder?.id || null,
      amount: finalAmount * 100,
      currency: "INR"
    });

  } catch (error) {
    console.error("Order Creation Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create order"
    });
  }
};


  

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id })

        
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    
    if (!razorpay_signature) {
      await Order.updateOne(
        { razorpayOrderId: razorpay_order_id },
        { $set: { status: "Pending", paymentStatus: "Failed" } }
      );
      return res.status(200).json({ success: false, message: "Payment signature missing." });
    }

    
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await Order.updateOne(
        { razorpayOrderId: razorpay_order_id },
        { $set: { status: "Pending", paymentStatus: "Failed" } }
      );
      return res.status(200).json({ success: false, message: "Invalid payment signature." });
    }

    
    await Order.updateOne(
      { razorpayOrderId: razorpay_order_id },
      { $set: { status: "Processing", paymentStatus: "Success" } }
    );

    
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

    res.status(200).json({
      success: true,
      message: "Payment Successful and order processed.",
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false, message: "Server error during payment verification." });
  }
};


const placeWalletOrder=async(req,res)=>{
  try {
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
        message: "Wallet Not Found",
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
   return res.status(200).json({success:true,message:"Order placed successfully"})


  } catch (error) {
    console.log(error);
    res.json({ success: false, message: 'Order placement failed' });
  }
}





const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId, reason, otherReason } = req.body;

    if (!orderId || !itemId || !reason) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (!["Pending", "Processing"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "Order cannot be modified" });
    }

    const itemIndex = order.orderedItems.findIndex(
      (item) => item.product && item.product._id && item.product._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in order" });
    }

    const item = order.orderedItems[itemIndex];
    if (item.cancellationStatus === "cancelled") {
      return res.status(400).json({ success: false, message: "Item already cancelled" });
    }

    
    item.cancellationStatus = "cancelled";
    item.cancellationReason = reason === "Other" ? otherReason : reason;
    item.cancelledAt = new Date();

    const itemTotal = item.price;

    
    order.totalPrice -= itemTotal;
    order.finalAmount = order.totalPrice - (order.discount || 0);

    
    const allItemsCancelled = order.orderedItems.every(itm => itm.cancellationStatus === "cancelled");
    if (allItemsCancelled) {
      order.status = "cancelled";
      order.cancellationReason = "All items cancelled";
      order.cancelledAt = new Date();
    }

    
    let wallet = null;
    if (order.paymentMethod !== "cod" && itemTotal > 0) {
      wallet = await refundToWallet(order.userId, itemTotal, order._id, `Refund for cancelled item in order #${orderId}`);
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
      refundAmount: itemTotal,
      order: {
        orderId: order.orderId,
        totalPrice: order.totalPrice,
        finalAmount: order.finalAmount,
        status: order.status,
      },
      wallet
    });
  } catch (error) {
    console.error("Cancel item error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel item", error: error.message });
  }
};


const paymentFailure=async(req,res)=>{
  try {
    const orderId = req.query.orderId;
   // console.log("Request Query:", req.query);

   // console.log("ORDERIDDDDDD",orderId)

    const orderData = await Order.findOne({ razorpayOrderId: orderId });

   // console.log("ORDERDATA",orderData)
    res.render("user/paymentFailure", { order: orderData });
  } catch (error) {
    console.log(error);
  }
}




// const loadRetryPayment = async (req, res, next) => {
//   try {
//     const userId = req.session.user;
//     let  user=await User.findById(userId)
//     const orderId = req.query.orderId;
//     const orderData = await Order.findOne({ orderId: orderId });
//     let wallet = await Wallet.findOne({ userId: user._id });
//     if (!wallet) {
//             wallet = new Wallet({ userId:user._id, balance: 0, transactions: [] });
//           }
          
//     res.render("user/retryPayment", { user, order: orderData, wallet });
//   } catch (error) {
//     next(error);
//   }
// };
 

const loadRetryPayment = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.id; // Use 'id' to match the query parameter from orders.ejs

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).render('error', {
        message: 'User not found or not authenticated',
        status: 401,
      });
    }

    // Validate order ID
    if (!orderId) {
      return res.status(400).render('error', {
        message: 'Order ID is required',
        status: 400,
      });
    }

    // Fetch order by _id (assuming orderId in query is MongoDB _id)
    const orderData = await Order.findById(orderId)
    if (!orderData) {
      return res.status(404).render('error', {
        message: 'Order not found',
        status: 404,
      });
    }

    // Check if order status is Pending
    if (orderData.status.toLowerCase() !== 'pending') {
      return res.status(400).render('error', {
        message: 'Retry payment is only available for pending orders',
        status: 400,
      });
    }

    // Fetch or create wallet
    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = new Wallet({ userId: user._id, balance: 0, transactions: [] });
      await wallet.save(); // Save the new wallet
    }

    // Render retryPayment.ejs with valid data
    res.render('user/retryPayment', { user, order: orderData, wallet });
  } catch (error) {
    console.error('Error in loadRetryPayment:', error);
    next(error); // Pass error to Express error middleware
  }
};
const retryPaymentCod = async (req, res, next) => {
  try {
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
  } catch (error) {
    console.log(error);
  }
};


const retryPaymentWallet = async (req, res) => {
  try {
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
  } catch (error) {
    console.log(error);
  }
};


const retryPaymentOnline = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};



const retryVerifyPayment = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const searchOrder=async(req,res)=>{
  try {
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
  } catch (error) {
    console.error(error)
  }
}



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