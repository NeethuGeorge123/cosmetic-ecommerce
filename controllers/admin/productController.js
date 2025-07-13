const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSignupSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    res.render("admin/product-add", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const addProducts = async (req, res) => {
  console.log("In addproducts:", req.body);
  try {
    const products = req.body;
    const productExists = await Product.findOne({
      productName: products.productName,
    });
    console.log("products EXISTS",productExists)
    if (!productExists) {
      const images = [];
      
      if (req.files && req.files.length > 0) {
        
        for (let i = 0; i < req.files.length; i++) {

          const originalImagePath = req.files[i].path;

          const resizedImageName = "resized-" + req.files[i].filename;//newly added

          const resizedImagePath = path.join(
            "public",
            "uploads",
            "re-image",
            resizedImageName
           // req.files[i].filename
          );
          
           await sharp(originalImagePath)
            .resize({ width: 440, height: 440 })
             .toFile(resizedImagePath);

             images.push(resizedImageName)
           
          //images.push(req.files[i].filename);
      
        }
        
      }
      

      //const categoryId = await Category.findOne({ name: products.category });

      const categoryData = await Category.findOne({ name: products.category });

      if (!categoryData) {
        return res.status(400).json("Invalid category name");
      }

      const regularPrice = parseFloat(products.regularPrice);

    // 👇 Calculate salePrice based on categoryOffer
    let salePrice;
    if (categoryData.categoryOffer > 0) {
      salePrice = regularPrice - (regularPrice * categoryData.categoryOffer) / 100;
    } else {
      salePrice = parseFloat(products.salePrice) || regularPrice;
    }


      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        brand: products.brand,
        category: categoryData._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdOn: new Date(),
        quantity: products.quantity,
        size: products.size,
        color: products.color,
        productImage: images,
        status: "Available",
        categoryId:categoryData._id,
        categoryOffer:categoryData.categoryOffer,
      });

      await newProduct.save();
      return res.redirect("/admin/addProducts");
    } else {
      return res
        .status(400)
        .json("Product already existb,pleasev try another name");
    }
  } catch (error) {
    console.error("Error saving product", error);
    return res.redirect("/admin/pageerror");
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 9;
    const productData = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    const count = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    }).countDocuments();
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    if (category && brand) {
      res.render("admin/products", {
        data: productData,
        currentPage: page,
        totalPages: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const findCategory = await Category.findOne({ _id: findProduct.category });
    if (findCategory.categoryOffer > percentage) {
      return res.json({
        status: false,
        message: "This products category already has a category offer ",
      });
    }

   

    findProduct.salePrice = Math.floor(findProduct.regularPrice * ((100 - percentage) / 100));
    findProduct.productOffer = parseInt(percentage);
    await findProduct.save();
    findCategory.categoryOffer = 0;
    await findCategory.save();
    return res.json({ status: true });
  } catch (error) {
    //res.redirect("/pageerror");
    console.log(error)
    res.status(500).json({ status: false, message: "Invalid server error" });
  }
};

const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const percentage = findProduct.productOffer;
    findProduct.salePrice =
      findProduct.salePrice +
      Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = 0;
    await findProduct.save();
    res.json({ status: true });
  } catch (error) {
    res.redirect("/pageerror");
  }
};


const blockProduct=async(req,res)=>{
    try {
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pageerror")
    }
}



const unblockProduct=async(req,res)=>{
    try {
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pageerror")
    }
}


const getEditProduct=async (req,res)=>{
    try {
        
        const id=req.query.id;
        const product=await Product.findOne({_id:id}).populate('category');
        const category=await Category.find({});
        const brand=await Brand.find({});
        res.render("admin/edit-product",{
            product:product,
            cat:category,
            brand:brand,
        })

    } catch (error) {
        res.redirect("/pageerror")
    }
}


const editProduct=async(req,res)=>{
    try {
        const id=req.params.id;
        const product=await Product.findOne({_id:id})
        const data=req.body;
        const existingProduct=await Product.findOne({productName:data.productName,
            _id:{$ne:id}
        })
        console.log("REQUST :",data)
         if(existingProduct)  {
            return res.status(400).json({error:"Product with this name already exists.Please try withanother "})
         } 

         const images=[];
         if(req.files && req.files.length>0){
            for(let i=0;i<req.files.length;i++){
                images.push(req.files[i].filename)
            }
         }

         const categoryId=await Category.findOne({name:data.category},{_id:1})

         const updateFields={
            productName:data.productName,
            description:data.descriptionData,
            category:categoryId,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            size:data.size,
            color:data.color,
            brand:data.brand
         }
        
         if(req.files.length>0){
            updateFields.$push={productImage:{$each:images}};

         }
         await Product.findByIdAndUpdate(id,updateFields,{new:true});
         res.redirect("/admin/products")

    } catch (error) {
      console.error(error)
        res.redirect("/pageerror")
    }
}

const deleteSingleImage=async(req,res)=>{
  try {
    const {imageNameToServer,productIdServer}=req.body;
    const product=await Product.findByIdAndUpdate(productIdServer,{$pull:{productImage:imageNameToServer}});
      const imagePath=path.join("public","uploads","re-image",imageNameToServer);
      if(fs.existsSync(imagePath)){
        await fs.unlinkSync(imagePath);
        console.log('Image ${imageNameToServer} deleted successfully');

      }else{
        console.log('Image ${imageNameToServer} not found ');

      }

      res.send({status:true});


      } catch (error) {
    res.redirect ("/pageerror")
  }
}


const loadInventoryPage = async (req, res) => {
  try {
    const perPage = 5;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search?.trim() || "";

    const query = search
      ? { productName: { $regex: new RegExp(search, "i") } }
      : {};

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / perPage);

    const products = await Product.find(query)
      .populate("category")
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    res.render("admin/inventory", {
      product: products,
      currentPage: page,
      totalPages,
      searched: search,
    });
  } catch (err) {
    console.error("Inventory load error:", err);
    res.status(500).send("Server error");
  }
};




const updateInventoryy = async (req, res) => {
  try {
    const productId = req.query.id;
    const { quantity } = req.body;
    console.log("Update button clicked for product ID:", productId);


    if (!productId || quantity == null) {
      return res.status(400).json({ success: false, error: "Missing product ID or quantity." });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { quantity },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }

    res.status(200).json({ success: true, updatedQuantity: updatedProduct.quantity });
  } catch (err) {
    console.error("Error updating inventory:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
};



const deleteImage = async (req, res) => {
  try {
      const { imageNameToServer, productIdToServer } = req.body;

      
      if (!imageNameToServer || !productIdToServer) {
          return res.status(400).json({ status: false, message: 'Image name and product ID are required.' });
      }
       console.log("imageName:",imageNameToServer)
    
      const product = await Product.findById(productIdToServer);
      if (!product) {
          return res.status(404).json({ status: false, message: 'Product not found.' });
      }

      
      if (!product.productImage.includes(imageNameToServer)) {
          return res.status(404).json({ status: false, message: 'Image not found in product.' });
      }

      await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})

      
      // product.productImage = product.productImage.filter(img => img !== imageNameToServer);
      // await product.save();

      
      // const imagePath = path.join(__dirname, '../uploads/re-image', imageNameToServer);
      // try {
      //     await fs.access(imagePath); 
      //     await fs.unlink(imagePath); 
      // } catch (err) {
      //     if (err.code !== 'ENOENT') {
      //         throw err; 
      //     }
      //    
      // }

      return res.status(200).json({ status: true, message: 'Image deleted successfully.' });
  } catch (error) {
      console.error('Error deleting image:', error);
      return res.status(500).json({ status: false, message: 'Server error while deleting image.' });
  }
};


const deleteTempImage = async (req, res) => {
  try {
      const { imageNameToServer, productIdToServer } = req.body;

    
      if (!imageNameToServer || !productIdToServer) {
          return res.status(400).json({ status: false, message: 'Image name and product ID are required.' });
      }

      
      const tempImagePath = path.join(__dirname, '../uploads/temp', imageNameToServer);

    
      try {
          await fs.access(tempImagePath); 
          await fs.unlink(tempImagePath); 
          return res.status(200).json({ status: true, message: 'Temporary image deleted successfully.' });
      } catch (err) {
          if (err.code === 'ENOENT') {
              
              return res.status(404).json({ status: false, message: 'Temporary image not found.' });
          }
          throw err; 
      }
  } catch (error) {
      console.error('Error deleting temporary image:', error);
      return res.status(500).json({ status: false, message: 'Server error while deleting temporary image.' });
  }
};


module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  loadInventoryPage,
  updateInventoryy,
  deleteImage,
  deleteTempImage,

};
