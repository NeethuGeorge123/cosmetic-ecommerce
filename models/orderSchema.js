const mongoose=require("mongoose");
const {Schema}=mongoose;



const orderSchema=new Schema({
    orderId:{
        type:String,
        unique:true,
        required:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    orderedItems:[{
        product:{
            productName:{
                type:String,
               
            },
            _id:{
                type:Schema.Types.ObjectId,

            },
            description:{
                type:String,
                
            },
            brand:{
                type:String,
                
            },
            category:{
                type:Schema.Types.ObjectId,
                ref:"Category",
                 
            },
            regularPrice:{
                type:Number,
               
            },
            salePrice:{
                type:Number,
               
            },
            productOffer:{
                type:Number,
                default:0,
        
            },
            quantity:{
                type:Number,
                default:true
        
            },
            color:{
                type:String,
               
            },
            productImage:{
                type:[String],
                
            },
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        },
        cancellationStatus: { type: String, default: "active" }, // Added
        cancellationReason: { type: String }, // Added
        cancellationOtherReason: { type: String }, // Added
        cancelledAt: { type: Date }, // Added
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    paymentMethod:{
        type:String,
        required:true,
        enum:['cod','wallet','online payment']
    },
    cancellationReason: {
        type: String,
      },
      returnReason: {
         type: String
         },
    returnRequestedAt: { 
        
        type: Date 
    },
    requestStatus:{
        type:String,
        enum:['pending','approved','rejected']
      },
      rejectionCategory:{
        type:String,
      },
      rejectionReason:{
        type:String,
      },
    address:{
        addressType:{
            type:String,
            required:true,

        },
        name:{
            type:String,
            required:true,
        },
        city:{
            type:String,
            required:true,
        },
        landMark:{
            type:String,
            required:true,
        },
        state:{
            type:String,
            required:true
        },
        pincode:{
            type:Number,
            required:true
        },
        phone:{
            type:String,
            required:true,
            
        },
        altPhone:{
            type:String,
            required:true
        }  
    },
    invoiceDate:{
        type:Date,
        
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','delivered','cancelled','return requested','returned','returning']
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    razorpayOrderId:{
        type:String,
        unique:true,
        sparse:true,
    },
    paymentStatus: {
        type: String,
        enum: ['Success', 'Failed'],
        default: 'Failed'
      },
      

})


const Order=mongoose.model("Order",orderSchema);
module.exports=Order;
