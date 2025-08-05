const User=require("../../models/userSignupSchema");
const Address=require("../../models/addressSchema");
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const env=require("dotenv").config();
const session=require("express-session");
const { generate } = require("otp-generator");
const sendVerificationEmail = require("../../util/sendVerificationEmail");
const { format } = require("sharp");

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



const getForgotPassPage=async (req,res)=>{
    try {
        res.render("user/forgot-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}




const forgotEmailValid=async(req,res)=>{
    try {
        
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

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const verifyForgotPassOtp=async(req,res)=>{
    try {
       const enteredOtp=req.body.otp;
       if(enteredOtp===req.session.userOtp){
        res.json({success:true,redirectUrl:"/reset-password"});
       } else{
        res.json({success:false,message:"OTP not matching"})
       }
    } catch (error) {
        res.status(500).json({success:false,message:"An error occured.Please try again"})
    }
}


const getResetPassPage=async(req,res)=>{
    try {
        res.render("user/reset-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const resendOtp= async(req,res)=>{
    try {
        const otp=generateOtp();
        req.session.userOtp=otp;
        const email=req.session.email;
    
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp)
            res.status(200).json({success:true,message:"Resend OTp Successful"});
        }
    } catch (error) {
        console.error("Error in resend otp",error);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}

const postNewPassword = async(req,res)=>{
    try {
        
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
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const userProfile = async(req,res)=>{
    try {
        
        const userId = req.session.user;
        const userData= await User.findById(userId);
        const addressData=await Address.findOne({userId : userId});
        res.render("user/profile",{
            user:userData,
            userAddress:addressData
        })

    } catch (error) {
        console.error("Error for retrieve profile data",error);
        res.redirect("/pageNotFound");
    }
}
 


const getMyProfile= async(req,res)=>{
    try {
        const userId = req.session.user;


        const userData= await User.findById(userId);
        const addressData=await Address.findOne({userId : userId});
        res.render("user/myProfile",{
            user:userData,
            userAddress:addressData
        })
    } catch (error) {
        console.error("Error for retrieve profile data",error);
        res.redirect("/pageNotFound");
    }
}


const changeEmail=async(req,res)=>{
    try {
        res.render("user/change-email")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const changeEmailValid= async(req,res)=>{
    try {
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
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


const verifyEmailOtp = async (req,res)=>{
    try {
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            req.session.userData = req.body.userData;
            res.render("user/new-email",{
                userData:req.session.userData,
            })

        }else{
            res.render("change-email-otp",{
                message:"OTP not matching",
                userData:req.session.userData,
            })
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const updateEmail = async(req,res)=>{
    try {
        const newEmail=req.body.newEmail;
        const userId=req.session.user;
        await User.findByIdAndUpdate(userId,{email:newEmail})
        res.render("user/profile")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const changePassword = async(req,res)=>{
    try {
        res.render("user/change-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}



const changePasswordValid= async (req,res)=>{
    try {
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
    } catch (error) {
        console.log("Error in send password validation",error);
        res.redirect("/pageNotFound")
    }
}

const verifyChangePassOtp= async (req,res)=>{
    try {
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
            res.json({success:false,message:"OTP Not Matching"})
        }
        
    } catch (error) {
        res.status(500).json({success:false,message:"An error occured.Please try again later"})
    }
}


const getMyAddress = async(req,res)=>{
    try {
        
        const user=req.session.user;
        const userAddress= await Address.findOne({userId:user});
            res.render("user/myaddress",{
            user:user,
            userAddress:userAddress,
        })
    } catch (error) {

        res.redirect("/pageNotFound")
    }
}


const addAddress=async(req,res)=>{
    try {
        const user=req.session.user;
        
        res.render("user/add-address",{
            user:user
        })
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const postAddAddress= async(req,res)=>{
    try {
        const userId=req.session.user;
        const userData= await User.findOne({_id:userId})
        const {addressType,name,city,landMark,state,pincode,phone,altPhone }=req.body ;
        const userAddress= await Address.findOne({userId:userData._id});
        if(!userAddress){
            const newAddress = new Address({
                userId:userData._id,
                address:[{addressType,name,city,landMark,state,pincode,phone,altPhone}]
            });
            await newAddress.save();
        }else{
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone})
            await userAddress.save();
        }

        res.redirect("/my-profile")
    } catch (error) {
       res.error("Error adding address",error)
       res.redirect("/pageNotFound")
    }
}

const  editAddress= async (req,res)=>{
    try {
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

    } catch (error) {
        console.error("Error in edit address",error);
        res.redirect("/pageNotFound");


    }
}

const postEditAddress= async(req,res)=>{
    try {
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
    } catch (error) {
        console.error("Error in edit address ",error)
        res.redirect("/pageNotFound")
    }
}

const deleteAddress= async(req,res)=>{
    try {
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


    } catch (error) {
        console.error("Error in delete addresss",error)
        res.redirect("/pageNotFound")
    }
}


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
    getMyAddress,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress

    
}