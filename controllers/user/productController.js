const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const User=require("../../models/userSignupSchema");
const asyncHandler = require("../../middlewares/asyncHandler");





const productDetails = asyncHandler(async(req, res) => {
    
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const productId = req.query.id;

    
    const product = await Product.findById(productId).populate('category');
    
    if (!product) {
        return res.render("user/product-details", {
            user: userData,
            product: null,
            unavailableReason: "This product no longer exists."
        });
    }

    if (product.isBlocked) {
        return res.render("user/product-details", {
            user: userData,
            product: null,
            unavailableReason: "This product is currently unavailable."
        });
    }
    
    
    const findCategory = product.category;
    
    if (!findCategory || findCategory.isListed === false) {
        return res.render("user/product-details", {
            user: userData,
            product: null,
            unavailableReason: "This product's category is currently unavailable."
        });
    }

    
    const categoryOffer = findCategory?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    const totalOffer = categoryOffer + productOffer;
    const isOutOfStock = product.quantity <= 0;
    
    const relatedProducts = await Product.find({
        category: findCategory._id,
        _id: { $ne: productId }, 
        isBlocked: false 
    })
    .populate('category')
    .limit(8) 
    .sort({ createdAt: -1 }); 

    
    const relatedProductsWithOffers = relatedProducts.map(relatedProduct => {
        const relCategoryOffer = relatedProduct.category?.categoryOffer || 0;
        const relProductOffer = relatedProduct.productOffer || 0;
        const relTotalOffer = relCategoryOffer + relProductOffer;
        
        return {
            ...relatedProduct.toObject(),
            totalOffer: relTotalOffer,
            isOutOfStock: relatedProduct.quantity <= 0
        };
    });

    res.render("user/product-details", {
        user: userData,
        product: product,
        quantity: product.quantity,
        isOutOfStock: isOutOfStock,
        unavailableReason: null,
        totalOffer: totalOffer,
        category: findCategory,
        relatedProducts: relatedProductsWithOffers 
    });
     
});



module.exports={
    productDetails,
}