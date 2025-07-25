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
        sparse:true,//single sign up time ph not must
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
    referralCode: {
        type: String,
        unique: true,
        sparse:true
      },
      referredBy: {
        type: String,
        default: null
      },
    isAdmin:{
        type:Boolean,
        default:false
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true
    },cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart",
    }],
    wallet:{
        type:Number,
        default:0,
    },
    walletHistory: [
        {
          amount: {
            type: Number,
            required: true,
          },
          type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
          },
          description: {
            type: String,
            required: true,
          },
          date: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    whishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now,
    },
    referalCode:{
        type:String,
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category"
        },
        brand:{
            type:String,
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }]
})
const User=mongoose.model("User",userSignupSchema)
module.exports=User;