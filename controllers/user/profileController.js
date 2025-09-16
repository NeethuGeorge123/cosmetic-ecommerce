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
                message:"User with this email does not exist"
            })
        }

    
})

const verifyForgotPassOtp=asyncHandler(async(req,res)=>{
    
       const enteredOtp=req.body.otp;
       if(enteredOtp===req.session.userOtp){
        res.json({success:true,redirectUrl:"/reset-password"});
       } else{
        res.json({success:false,message:"OTP not matching"})
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
            res.render("user/reset-password",{message:'password do not match'})
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
                message:"User with this email not exists"

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
                message:"OTP not matching",
                userData:req.session.userData,
            })
        }
    
})


const updateEmail = asyncHandler(async(req,res)=>{
    
        const newEmail=req.body.newEmail;
        const userId=req.session.user;
        await User.findByIdAndUpdate(userId,{email:newEmail})
        const user=await User.findById(userId)
        res.render("user/myProfile",{user})
    
})


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
            return res.status(404).send("Address not found")
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
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    resendChangePassOtp,
    getMyAddress,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress

    
}