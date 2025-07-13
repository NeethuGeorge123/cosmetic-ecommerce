const User=require("../../models/userSignupSchema")
const Product=require("../../models/productSchema")
const Wishlist=require("../../models/wishlistSchema")
const Cart=require("../../models/cartSchema")



const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;

        const wishlistDoc = await Wishlist.findOne({ userId });

        let wishlistProducts = [];

        if (wishlistDoc && wishlistDoc.products.length > 0) {
        
            const wishlistProductIds = wishlistDoc.products.map(item => item.productId.toString());

            const cart = await Cart.findOne({ userId });
            const cartProductIds = cart 
                ? cart.items.map(item => item.productId.toString())
                : [];

            
            const filteredProductIds = wishlistProductIds.filter(
                pid => !cartProductIds.includes(pid)
            );

            wishlistProducts = await Product.find({ _id: { $in: filteredProductIds } }).populate('category');
        }

        res.render("user/wishlist", {
            wishlist: wishlistProducts
        });

    } catch (error) {
        console.error("Error loading wishlist:", error);
        res.redirect("/pageNotFound");
    }
};




const addToWishlist = async (req, res) => {
    const userId = req.session.user;
    const productId = req.body.productId;
    const cart=await Cart.findOne({userId})
    

    
    const specificItem=cart.items.find((item)=>
        item.productId && item.productId.toString()===productId.toString()
    
    )

    
    if(specificItem){
        return res.status(200).json({ status: false, message: 'Product already in cart' });
    }


    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
        wishlist = new Wishlist({ userId, products: [] });
    }

    const alreadyExists = wishlist.products.find(p => p.productId.toString() === productId);
    if (alreadyExists) {
        return res.status(200).json({ status: false, message: 'Product already in wishlist' });
    }

    wishlist.products.push({ productId });
    await wishlist.save();
    return res.status(200).json({ status: true, message: 'Product added to wishlist' });
};







const removeProduct = async (req, res) => {
    try {
        const productId = req.query.productId;
        const userId = req.session.user;
        

        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(400).json({success:false,message:'Wishlist not available'})
        }

        wishlist.products = wishlist.products.filter(
            (p) => p.productId.toString() !== productId
        );
        

        await wishlist.save();
        return res.status(200).json({success:true,message:"Product removed successfully"})

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Server error' });
    }
};
 


module.exports={loadWishlist,
    addToWishlist,
    removeProduct
}