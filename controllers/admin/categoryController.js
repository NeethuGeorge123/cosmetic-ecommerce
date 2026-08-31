
const mongoose = require('mongoose');
const Category=require("../../models/categorySchema")
const Product=require("../../models/productSchema")





const categoryInfo = async (req, res) => {
    try {
        
        const page = parseInt(req.query.page) || 1;
        const limit = 7;
        const skip = (page - 1) * limit;

        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        const filter = {
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { description: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        };

        const categoryData = await Category.find(filter)
            .sort({ createdAt:-1 ,_id:-1})
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalCategories / limit);

        res.render("admin/category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            search: search  
        });
    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
}


const addCategory=async (req,res)=>{
    

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
      
  
      const { percentage, categoryId } = req.body;
  
      
      if (!categoryId) {
       
        return res.status(400).json({ status: false, message: 'Category ID is required' });
      }
      if (!mongoose.isValidObjectId(categoryId)) {
       
        return res.status(400).json({ status: false, message: 'Invalid category ID' });
      }
      const offerPercentage = parseInt(percentage);
      if (isNaN(offerPercentage) || offerPercentage < 0 || offerPercentage > 100) {
        
        return res.status(400).json({ status: false, message: 'Percentage must be a number between 0 and 100' });
      }
  
    
      
      const category = await Category.findById(categoryId);
      if (!category) {
        
        return res.status(404).json({ status: false, message: 'Category not found' });
      }
  
      
      
      const products = await Product.find({ category: category._id });
      
  
    
      const hasProductOffer = products.some((product) => product.productOffer > offerPercentage);
      if (hasProductOffer) {
        
        return res.status(400).json({ status: false, message: 'Products within this category have higher individual offers' });
      }
  
    
      
      await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: offerPercentage } });
  
      
      
      for (const product of products) {
        const oldSalePrice = product.salePrice;
        product.productOffer = 0;
        product.salePrice = product.regularPrice * (1 - offerPercentage / 100);
        await product.save();
        const discountAmount = product.regularPrice - product.salePrice;
       
      }
  
      
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


const editCategory = async (req, res) => {
    try {
        const id = req.params.id;

       

        if (!req.body.categoryName || !req.body.description) {
            return res.status(400).json({ error: "Name and description are required" });
        }

        const categoryName = req.body.categoryName.trim().toUpperCase();
        const description = req.body.description.trim();

        if (categoryName.length < 3) {
            return res.status(400).json({ error: "Category name must be at least 3 characters" });
        }
        if (/^\d+$/.test(categoryName)) {
            return res.status(400).json({ error: "Category name cannot contain only numbers" });
        }
        if (description.length < 4) {
            return res.status(400).json({ error: "Description must be at least 4 characters" });
        }

        const existingCategory = await Category.findOne({
            _id: { $ne: id },
            name: { $regex: `^${categoryName}$`, $options: 'i' }
        });

        
        if (existingCategory) {
            return res.status(400).json({ error: "Category exists, please choose another name" });
        }

        const updateCategory = await Category.findByIdAndUpdate(
            id,
            { name: categoryName, description: description },
            { new: true }
        );

        if (updateCategory) {
            return res.json({ message: "Category updated successfully" });
        } else {
            return res.status(400).json({ error: "Category not found" });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

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