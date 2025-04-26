const User=require("../../models/userSignupSchema");
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

// const sendVerificationEmail=async(email,otp)=>{
//     try {
//         transporter=nodemailer.createTransport({
//             service:"gmail",
//             port:587,
//             secure:false,requireTLS:true,
//             auth:{
//                 user:process.env.NODEMAILER_EMAIL,
//                 pass:process.env.NODEMAILER_PASSWORD,
//             }
//         }) 
//     } catch (error) {
        
//     }
// }


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
        console.log("forgotemail valid function ")
        const {email}=req.body;
        const findUser=await User.findOne({email:email});
        console.log("Find user:",findUser)
        if(findUser){
            console.log("check if user")
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
        console.log("Resending otp to email",email);
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
        console.log("password:",req.body)
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

module.exports={getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
}