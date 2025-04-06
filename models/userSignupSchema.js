const mongoose=require("mongoose")
const {Schema}=mongoose;

const userSignupSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    phone:{
        type:String,
        required:false,
        //unique:false,
        //sparse:true,//single sign up time ph not must
        default:null
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    isVerified:{
type:Boolean,
default:false
    },
    
    isAdmin:{
        type:Boolean,
        default:false
    }
})
const User=mongoose.model("User",userSignupSchema)
module.exports=User;