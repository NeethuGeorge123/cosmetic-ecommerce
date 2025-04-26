const multer=require("multer")
const path=require("path");




const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,path.join(__dirname,"../public/uploads/re-image"));

    },
    filename:(req,file,cb)=>{
        
        cb(null, Date.now() + "." + file.originalname);

    }
});


// File type filter
// const fileFilter = (req, file, cb) => {
//     const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
//     if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error('Invalid file type. Only JPEG, PNG, JPG, and WEBP are allowed.'), false);
//     }
// };

// Export multer with both storage and filter
// const upload = multer({ storage,fileFilter });






module.exports={storage};