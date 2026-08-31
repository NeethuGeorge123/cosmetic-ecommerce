const User=require("../../models/userSignupSchema");
const Address=require("../../models/addressSchema");
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const env=require("dotenv").config();
const session=require("express-session");
const { generate } = require("otp-generator");
const sendVerificationEmail = require("../../util/sendVerificationEmail");
const { format } = require("sharp");
const asyncHandler = require("../../middlewares/asyncHandler");
const Messages=require("../../util/messages/profileMessages")
const { upload } = require("../../helpers/multer"); 


function generateOtp(){
    const digits="1234567890";
    let otp=""
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp;
}; 

  

const securePassword=async (password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
    return passwordHash;
    } catch (error) {
        
    }
    

}



const getForgotPassPage=asyncHandler(async (req,res)=>{
    
        res.render("user/forgot-password")
    
})




const forgotEmailValid=asyncHandler(async(req,res)=>{
    
        
        const {email}=req.body;
        const findUser=await User.findOne({email:email});
        
        if(findUser){
            
            const otp=generateOtp();
            const emailSent=await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp=otp;
                req.session.email=email;
                res.render("user/forgotPass-otp")
                console.log("OTP:",otp)

            }else{
                res.json({success:false,message:"Failed to send OTP.Please try again"})
            }
        }else{
            res.render("user/forgot-password",{
                message:Messages.USER_NOT_FOUND_EMAIL
            })
        }

    
})

const verifyForgotPassOtp=asyncHandler(async(req,res)=>{
    
       const enteredOtp=req.body.otp;
       if(enteredOtp===req.session.userOtp){
        res.json({success:true,redirectUrl:"/reset-password"});
       } else{
        res.json({success:false,message:Messages.OTP_FAILED })
       }
    
})


const getResetPassPage=asyncHandler(async(req,res)=>{
    
        res.render("user/reset-password")
    
})


const resendOtp= asyncHandler(async(req,res)=>{
    
        const otp=generateOtp();
        req.session.userOtp=otp;
        const email=req.session.email;
    
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp)
            res.status(200).json({success:true,message:"Resend OTp Successful"});
        }
    
})

const postNewPassword = asyncHandler(async(req,res)=>{
    
        
        const {newPass1,newPass2}=req.body;
        const email=req.session.email;
        if(newPass1===newPass2){
            const passwordHash=await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect("/login")
        }else{
            res.render("user/reset-password",{message:Messages.PASSWORDS_NOT_MATCH})
        }
   
})


const userProfile = asyncHandler(async(req,res)=>{
    
        
        const userId = req.session.user;
        const userData= await User.findById(userId);
        const addressData=await Address.findOne({userId : userId});
        res.render("user/profile",{
            user:userData,
            userAddress:addressData
        })

    
})
 


const getMyProfile= asyncHandler(async(req,res)=>{
    
        const userId = req.session.user;


        const userData= await User.findById(userId);
        const addressData=await Address.findOne({userId : userId});
        res.render("user/myProfile",{
            user:userData,
            userAddress:addressData
        })
    
})


const changeEmail=asyncHandler(async(req,res)=>{
    
        res.render("user/change-email")
    
})


const changeEmailValid= asyncHandler(async(req,res)=>{
    
        const {email}= req.body;
        const userExists = await User.findOne({email});
        if(userExists){
            const otp = generateOtp();
            const emailSent=await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp=otp;
                req.session.userData=req.body;
                req.session.email=email;
                res.render("user/change-email-otp");
                  
                console.log("OTP",otp)
            }else{
                res.json("email-error");
            }
        }else{
            res.render("user/change-email",{
                message: Messages.EMAIL_NOT_EXISTS

            })
        }
    
})


const verifyEmailOtp = asyncHandler(async (req,res)=>{
    
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            req.session.userData = req.body.userData;
            res.render("user/new-email",{
                userData:req.session.userData,
            })

        }else{
            res.render("user/change-email-otp",{
                message:Messages.OTP_NOT_MATCHING,
                userData:req.session.userData,
            })
        }
    
})


const submitNewEmail = asyncHandler(async (req, res) => {
    const newEmail = req.body.newEmail ? req.body.newEmail.trim().toLowerCase() : "";
    const userId = req.session.user;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    const currentUser = await User.findById(userId);
    if (currentUser.email.toLowerCase() === newEmail) {
        return res.status(400).json({ success: false, message: "This is already your current email" });
    }

    const emailTaken = await User.findOne({ email: newEmail });
    if (emailTaken) {
        return res.status(400).json({ success: false, message: "This email is already registered to another account" });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(newEmail, otp);

    if (!emailSent) {
        return res.status(500).json({ success: false, message: "Failed to send OTP. Please try again" });
    }

    req.session.newEmailOtp = otp;
    req.session.pendingNewEmail = newEmail;
    console.log("New Email OTP:", otp);

    return res.json({ success: true, message: "OTP sent to your new email" });
});


const verifyNewEmailOtp = asyncHandler(async (req, res) => {
    const enteredOtp = req.body.otp;
    const userId = req.session.user;

    if (!req.session.pendingNewEmail || !req.session.newEmailOtp) {
        return res.status(400).json({ success: false, message: "Session expired. Please restart the process." });
    }

    if (enteredOtp !== req.session.newEmailOtp) {
        return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { email: req.session.pendingNewEmail },
        { new: true }
    );

    if (!updatedUser) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    
    delete req.session.newEmailOtp;
    delete req.session.pendingNewEmail;
    delete req.session.userOtp;
    delete req.session.userData;
    delete req.session.email;

    return res.json({ success: true, message: "Email updated successfully" });
});

const changePassword = asyncHandler(async(req,res)=>{
    
        res.render("user/change-password")
    
})



const changePasswordValid= asyncHandler(async (req,res)=>{
    
        const {email}=req.body;
        const userExists = await User.findOne({email})
        if(userExists){
            const otp=generateOtp();
            const emailSent=await sendVerificationEmail(email,otp)
            if(emailSent){
                req.session.userOtp=otp;
                req.session.userData=req.body;
                req.session.email=email;
                res.render("user/change-password-otp")
                console.log("OTP",otp);
            }else{
                res.json({
                    success:false,  
                    message:"Failed to send OTP.Please try again"
                })
            }
        }else{
            res.render("user/change-password",{
                message:"User does not exists"
            })
        }
    
})

const verifyChangePassOtp= asyncHandler(async (req,res)=>{
    
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
            res.json({success:false,message:"OTP Not Matching"})
        }
        
    
})
const resendChangePassOtp=asyncHandler(async (req,res)=>{
    
        if(!req.session.email){
            return res.json({success:false,message:"Session expired"})
        }
        const email=req.session.email
        const userExists=await User.findOne({email})
        if(!userExists){
            return res.json({success:false,message:"User not found"})
        }

        const newOtp=generateOtp();
        const emailSent=await sendVerificationEmail(email,newOtp)
        if(emailSent){
            req.session.userOtp=newOtp
            console.log("New OTP:",newOtp)
            res.json({success:true,message:"OTP resent successfully"})
        }else{
            res.json({success:false,message:"Failed to resent OTP"})
        }
    
})


const getMyAddress = asyncHandler(async(req,res)=>{
    
        
        const user=req.session.user;
        const userAddress= await Address.findOne({userId:user});
            res.render("user/myaddress",{
            user:user,
            userAddress:userAddress,
        })
    
})


const addAddress=asyncHandler(async(req,res)=>{
    
        const user=req.session.user;
        
        res.render("user/add-address",{
            user:user
        })
    
})

const postAddAddress= asyncHandler(async(req,res)=>{
    
        const userId=req.session.user;
        const userData= await User.findOne({_id:userId})
        const {addressType,name,city,landMark,state,pincode,phone,altPhone,countryCode,altCountryCode }=req.body ;
         const fullPhone=countryCode+phone;
         const fullAltPhone=altCountryCode+altPhone;
        const userAddress= await Address.findOne({userId:userData._id});
        if(!userAddress){
            const newAddress = new Address({
                userId:userData._id,
                address:[{addressType,name,city,landMark,state,pincode,phone:fullPhone,altPhone:fullAltPhone}]
            });
            await newAddress.save();
        }else{
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone:fullPhone,altPhone:fullAltPhone})
            await userAddress.save();
        }

        res.redirect("/my-profile")
    
})

const  editAddress= asyncHandler(async (req,res)=>{
    
        const addressId=req.query.id;
        const user=req.session.user;
        const currAddress=await Address.findOne({
            "address._id":addressId,
        }); 
        if(!currAddress){
            return res.redirect("/pageNotFound")
        }

        const addressData=currAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString();

        })

        if(!addressData){
            return res.redirect("/pageNotFound")
        }

        res.render("user/edit-address",{address:addressData,user:user})

    
})

const postEditAddress= asyncHandler(async(req,res)=>{

        const data=req.body;
        const addressId=req.query.id;
        const user=req.session.user;
        const findAddress=await Address.findOne({"address._id":addressId})
        if(!findAddress){
            res.redirect("/pageNotFound")
        }
        await Address.updateOne(
            {"address._id":addressId},
            {$set:{
                "address.$":{
                    _id:addressId,
                    addressType:data.addressType,
                    name:data.name,
                    city:data.city,
                    landMark:data.landMark,
                    state:data.state,
                    pincode:data.pincode,
                    phone:data.phone,
                    altPhone:data.altPhone,
                }
            }}
        )

        res.redirect("/userProfile")
    
})

const deleteAddress= asyncHandler(async(req,res)=>{
    
        const addressId = req.query.id;
        const findAddress = await Address.findOne({"address._id":addressId})
        if(!findAddress){
            return res.status(404).send(Messages.ADDRESS_NOT_FOUND);
        }

        await Address.updateOne({
            "address._id":addressId
        },
        {
          $pull:{
            address:{
                _id:addressId,
            }
          }  
        }
    )

    res.redirect("/userProfile")


    
})
const updateProfileName = asyncHandler(async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
        }

        const name = req.body.name ? req.body.name.trim() : "";

        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required" });
        }
        if (!/^[A-Za-z ]{3,50}$/.test(name)) {
            return res.status(400).json({ success: false, message: "Name must be 3-50 letters only" });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, { name }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({ success: true, message: "Name updated successfully" });

    } catch (error) {
        console.error("Error updating profile name:", error);
        return res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
});


const updateProfileImage = [
    upload.single("profileImage"),
    asyncHandler(async (req, res) => {
        try {
            const userId = req.session.user;
            if (!userId) {
                return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
            }
            if (!req.file) {
                return res.status(400).json({ success: false, message: "No image file uploaded" });
            }

            const imageUrl = `/uploads/re-image/${req.file.filename}`;

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { profileImage: imageUrl },
                { new: true }
            );

            if (!updatedUser) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            return res.json({ success: true, message: "Profile image updated", imageUrl });

        } catch (error) {
            console.error("Error updating profile image:", error);
            return res.status(500).json({ success: false, message: "Server error while uploading image" });
        }
    })
];


module.exports={getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    getMyProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    //updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    resendChangePassOtp,
    getMyAddress,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    updateProfileName,
    updateProfileImage,
    submitNewEmail,
    verifyNewEmailOtp


    
}