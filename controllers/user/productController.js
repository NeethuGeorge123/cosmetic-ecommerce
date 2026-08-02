const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const User=require("../../models/userSignupSchema");
const asyncHandler = require("../../middlewares/asyncHandler");





const productDetails = asyncHandler(async(req, res) => {
    
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const productId = req.query.id;

    
    const product = await Product.findById(productId).populate('category');
    const findCategory = product.category;
    const categoryOffer = findCategory?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    const totalOffer = categoryOffer + productOffer;

    
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
            totalOffer: relTotalOffer
        };
    });

    res.render("user/product-details", {
        user: userData,
        product: product,
        quantity: product.quantity,
        totalOffer: totalOffer,
        category: findCategory,
        relatedProducts: relatedProductsWithOffers 
    });
   
});



module.exports={
    productDetails,
}