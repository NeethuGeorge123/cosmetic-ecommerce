
const mongoose = require('mongoose');
const Category=require("../../models/categorySchema")
const Product=require("../../models/productSchema")





const categoryInfo=async (req,res)=>{
    try {
        console.log("Fetching categories...");
        const page=parseInt(req.query.page) || 1;
        const limit=7;
        const skip=(page-1)*limit;

        const categoryData=await Category.find({})
        .sort({createdAt:1})
        .skip(skip)
        .limit(limit);


        const totalCategories=await Category.countDocuments();
        const totalPages=Math.ceil(totalCategories/limit)
        
        console.log("Categories fetched successfully");
        res.render("admin/category",{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories
        });
    } catch (error) {
         console.error(error);
         res.redirect("/pageerror")
    }
}


const addCategory=async (req,res)=>{
    console.log("enter the addCategory function",req.body)

    const categoryName  = req.body.name.trim().toUpperCase();
        const description = req.body.description;
    try {
        const existingCategory=await Category.findOne({name:new RegExp(`^${categoryName}$`, 'i')});

        

        if(existingCategory){
            return res.status(400).json({error:"Category already exist"})
        }
        const newCategory=new Category({
            name:categoryName,
            description:description.trim(),
            status:true,
            offer:false
        });
        await newCategory.save();
        //res.redirect("/admin/category")
        return res.json({message:"Category added Successfully"})


    } catch (error) {
        return res.status(500).json({error:"Internal Server Error"})
    }
}




const addCategoryOffer = async (req, res) => {
    try {
      console.log('addCategoryOffer called at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      console.log('Request body:', req.body);
  
      const { percentage, categoryId } = req.body;
  
      
      if (!categoryId) {
        console.log('Missing categoryId');
        return res.status(400).json({ status: false, message: 'Category ID is required' });
      }
      if (!mongoose.isValidObjectId(categoryId)) {
        console.log('Invalid categoryId:', categoryId);
        return res.status(400).json({ status: false, message: 'Invalid category ID' });
      }
      const offerPercentage = parseInt(percentage);
      if (isNaN(offerPercentage) || offerPercentage < 0 || offerPercentage > 100) {
        console.log('Invalid percentage:', percentage);
        return res.status(400).json({ status: false, message: 'Percentage must be a number between 0 and 100' });
      }
  
    
      console.log('Fetching category:', categoryId);
      const category = await Category.findById(categoryId);
      if (!category) {
        console.log('Category not found:', categoryId);
        return res.status(404).json({ status: false, message: 'Category not found' });
      }
  
      
      console.log('Fetching products for category:', categoryId);
      const products = await Product.find({ category: category._id });
      console.log('Products found:', products.length);
  
    
      const hasProductOffer = products.some((product) => product.productOffer > offerPercentage);
      if (hasProductOffer) {
        console.log('Conflicting product offers found:', { categoryId, offerPercentage });
        return res.status(400).json({ status: false, message: 'Products within this category have higher individual offers' });
      }
  
    
      console.log('Updating category offer:', { categoryId, categoryOffer: offerPercentage });
      await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: offerPercentage } });
  
      
      console.log('Updating products for category:', categoryId);
      for (const product of products) {
        const oldSalePrice = product.salePrice;
        product.productOffer = 0;
        product.salePrice = product.regularPrice * (1 - offerPercentage / 100);
        await product.save();
        const discountAmount = product.regularPrice - product.salePrice;
        console.log('Product updated:', {
          productId: product._id,
          salePrice: product.salePrice,
          discountAmount: discountAmount
        });
      }
  
      console.log('Category offer applied successfully:', { categoryId, offerPercentage });
      res.json({ status: true, message: 'Category offer applied successfully' });
    } catch (error) {
      console.error('Add Category Offer Error:', {
        message: error.message,
        stack: error.stack,
        categoryId: req.body.categoryId,
        percentage: req.body.percentage
      });
      res.status(500).json({ status: false, message: 'Internal server error' });
    }
  };
    



const removeCategoryOffer=async (req,res)=>{
    try {
        const categoryId=req.body.categoryId;
        const category=await Category.findById(categoryId);
        if(!category){
            return res.status(404).json({status:false,message:"Category not found"})
        }
        const percentage=category.categoryOffer;
        const products=await Product.find({category:category._id});

        if(products.length>0){
            for(const product of products){
                product.salePrice+=Math.floor(product.regularPrice*(percentage/100));
                product.productOffer=0;
                await product.save();

            }
        }

        category.categoryOffer=0;
        await category.save();
        res.json({status:true})
    } catch (error) {
        res.status(500).json({status:false,message:"Internal server error"})
    }
}




const getListCategory=async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
    res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/pageerror")
    }
}



const getUnlistCategory=async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect("/admin/category");

    } catch (error) {
        res.redirect("/pageerror")
    }
}


const getEditCategory=async (req,res)=>{
    try {
       const id=req.query.id;
       const category=await Category.findOne({_id:id}) ;
       res.render("admin/edit-category",{category:category})

    } catch (error) {
        res.redirect("/pageerror")
    }
}


const editCategory=async(req,res)=>{
    try {
        const id=req.params.id;
        
        // const {categoryName,description}=req.body;
        const categoryName  = req.body.categoryName.trim().toUpperCase();
        const description = req.body.description;
        const existingCategory = await Category.findOne({  name: { $regex: `^${categoryName}$`, $options: 'i' } });

        

        if(existingCategory){
            return res.status(400).json({error:"Category exist,Please choose another name"})
        }

        const updateCategory =await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description,
        },{new:true});

        if(updateCategory){
            res.redirect("/admin/category");
        }else{
            res.status(400).json({error:"category not found"})
        }




    } catch (error) {
        console.error("Error in editCategory:", error);
        res.status(500).json({error:"Internal server error"})
    }
}

module.exports={
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory
}