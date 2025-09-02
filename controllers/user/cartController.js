const Product=require("../../models/productSchema")
const Category= require("../../models/categorySchema");
const User = require("../../models/userSignupSchema")
const Cart=require("../../models/cartSchema")
const Address=require("../../models/addressSchema")
const Coupon=require("../../models/couponSchema")
const Wallet =require("../../models/walletSchema")





const addToCart = async (req, res) => {

  try {
    const userId = req.session.user; 
    const productId = req.body.productId;
    //console.log("PRODUCTID",productId)

    const product = await Product.findById(productId);
    
   
    if (!product || product.isBlocked || product.isUnlisted || product.stock <= 0) {
      return res.status(400).json({ status:false,message: "Product not available" });
    }


    if (product.category.isBlocked) {
      return res.status(400).json({ status:false,message: "Product category is blocked" });
    }

    let cart = await Cart.findOne({ userId });
  

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(item => item.productId.equals(productId));
    

    if (existingItemIndex > -1) {

      if(cart.items[existingItemIndex].quantity>=5){
        return res.status(200).json({ status:false,message: "Purchase limit reached" });
      }
    
      if (cart.items[existingItemIndex].quantity < product.quantity) {
        cart.items[existingItemIndex].quantity += 1;
      } else {
        return res.status(400).json({ status:false,message: "No more stock available" });
      }
    } else {
    

      const totalPrice= product.salePrice
      cart.items.push({ productId, quantity: 1 ,totalPrice,price:product.salePrice});
    }

    

    await cart.save();
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    
    return res.status(200).json({ status:true,message: "Product added to cart",count });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



const getCart= async(req,res)=>{
    
try {
    const user = req.session.user;
    const cart= await Cart.findOne({userId:user}).populate({
        path: "items.productId",
        populate:[ 
        {
            path:'category',
            model:'Category'
        }]
    });

    const cartData = cart.items.filter(item => item.productId && item.productId.isBlocked === false)
        .map(item => ({
            productDetails: item.productId, 
            quantity: item.quantity
        }));


        let grandTotal = cart.items.filter(item => item.productId && item.productId.isBlocked === false)
        .reduce((acc, item) => {
            return acc + (item.productId?.salePrice || 0) * item.quantity; 
        }, 0);

    res.render("user/cart",{
        data:cartData,
        grandTotal,
        user:user,

    })
} catch (error) {
    res.redirect("")
}
}




const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId,count } = req.body;

    const cartItem = await Cart.findOne({ userId, 'items.productId': productId }).populate({
      path:"items.productId"
    });

    if (!cartItem) {
      return res.json({ success: false, message: 'Cart item not found' });
    }
 
    const item = cartItem.items.find(item => item.productId._id.toString() === productId);
    console.log("ITEMS",item)

    if (!item) {
      return res.json({ success: false, message: 'Product not found in cart' });
    }

    const newQuantity = item.quantity + count;
    
    item.totalPrice = newQuantity*item.productId.salePrice;
    
    if (newQuantity < 1) {
      return res.json({ success: false, message: 'Minimum quantity is 1' });
    }
   
    const product = await Product.findById(productId);
    if (newQuantity > product.quantity) {
      return res.json({ success: false, message: 'Exceeds available stock' });
    }

    item.quantity = newQuantity;
    item.totalPrice=newQuantity * item.productId.salePrice;
    
    const grandTotal=cartItem.items.reduce((total,item)=>{
      return total+(item.quantity*item.productId.salePrice)
    },0)

    await cartItem.save();

    res.json({ success: true ,
      grandTotal:grandTotal
    });
  } catch (err) {
    console.error('updateCartQuantity error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};




const deleteFromCart = async (req, res) => {
    try {
      const userId = req.session.user;
      const productId = req.query.productId;
  
      if (!userId || !productId) {
        return res.status(400).json({ success: false, error: "Invalid request" });
      }
  
      const cart = await Cart.findOne({ userId });
  
      if (!cart) {
        return res.status(404).json({ success: false, error: "Cart not found" });
      }
  
      cart.items = cart.items.filter(item => item.productId.toString() !== productId);
  
      await cart.save();
  
    
      let grandTotal = 0;
      for (const item of cart.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          grandTotal += product.salePrice * item.quantity;
        }
      }
  
      res.json({
        success: true,
        message: "Product removed from cart",
        grandTotal
      });
  
    } catch (error) {
      console.error("deleteFromCart error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  };


   
    const getCheckout= async (req, res) => {
      try {
        
        const userId = req.session.user;
        const user= await User.findById(userId)
        const wallet=await Wallet.findOne({userId})
    
        const userAddress = await Address.findOne({ userId });
         const coupon = await Coupon.find({ isList: true });
        const cart = await Cart.findOne({ userId }).populate({
          path:"items.productId"
        });

         
  
        let subtotal = 0;
        let cartItems=cart.items;
        
        cart.items.forEach(item => {
          
          subtotal += item.productId.salePrice * item.quantity;
        });
    
        
        res.render('user/checkout', {
          userAddress,
          user,
          cartItems:cart.items,
          subtotal,
          wallet:wallet || {balance:0},
          coupons:coupon
        });
      } catch (error) {
        console.log(error);
        res.redirect('/error');
      }
    };
    
    const validateCheckout=async (req,res)=>{
      try {
        const userId=req.session.user
       
        const cart=await Cart.findOne({userId}).populate('items.productId')
        if(!cart || !cart.items.length){
          return res.status(400).json({status:false,message:"Your cart is empty"})
        }
        
        for(let item of cart.items){
          const product= item.productId
          if(!product || product.isBlocked || product.quantity<item.quantity){
            return res.status(400).json({status:false,message:"Stock not available"})
           }
        }
        return res.status(200).json({status:true})
        
      } catch (error) {
        console.error(error)
      }
    }


    const getCartCount = async (req, res) => {
      try {
          const userId = req.session.user;
          if (!userId) {
              return res.status(200).json({ status: false, count: 0 });
          }
  
          const cart = await Cart.findOne({ userId });
          if (!cart) {
              return res.status(200).json({ status: false, count: 0 });
          }
  
          //const count = cart.items.length; 
           
           const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  
          return res.status(200).json({ status: true, count });
      } catch (error) {
          console.error('getCartCount error:', error);
          res.status(500).json({ status: false, count: 0 });
      }
  };
  
  

module.exports={
    addToCart,
    getCart,
    updateCartQuantity,
    deleteFromCart,
    getCheckout,
    getCartCount,
    validateCheckout,
  
}