const User=require("../../models/userSignupSchema");
const Address=require("../../models/addressSchema");
const Wallet=require("../../models/walletSchema")
const razorpay=require("../../config/razorpay")
const crypto=require("crypto")



const loadWallet=async(req,res)=>{
    try {
        const userId=req.session.user
        const user=await User.findById(userId)
        const page=parseInt(req.query.page )|| 1
        const limit=7
        const skip=(page-1)*limit;
        const wallet=await Wallet.findOne({userId})
        if(!wallet){
        
      return  res.render("user/wallet",{
            wallet:{},
            transactions:[],
            currentPage:1,
            totalPages:1,
            user,
    })
}

const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        
        const paginatedTransactions = wallet.transactions
           .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(skip, skip + limit)
            
        res.render("user/wallet", {
             user,
            wallet: wallet,
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.log(error)
    }
}


const createOrder = async (req, res) => {
    try {
      const { amount } = req.body;
  
  
      if (!amount || amount <= 0) {
        return res.status(400).json({ success:false,error: "Invalid amount" });
      }
  
      const options = {
        amount: amount * 100, 
        currency: "INR",
        receipt: `txn_${Date.now()}`,
      };
  
      const order = await razorpay.orders.create(options);
      res.status(200).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success:false,error: "Server error" });
    }
  };
  
  
   const verifyPayment = async (req, res) => {
      try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
        const userId = req.session.user; 
          
        const generatedSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(razorpay_order_id + "|" + razorpay_payment_id)
          .digest("hex");
    
        if (generatedSignature !== razorpay_signature) {
          return res.status(400).json({success:false,error: "Invalid payment signature" });
        }
    
      
        let wallet = await Wallet.findOne({ userId:userId });
        if (!wallet) {
          wallet = new Wallet({ userId, balance: 0, transactions: [] });
        }
    
        
        wallet.balance += parseInt(amount);
  
        wallet.transactions.push({ amount, type: "credit", description: "Wallet Top-Up" });
    
        await wallet.save();
    
        res.status(200).json({success:true, message: "Payment successful", wallet });
      } catch (error) {
        console.error(error);
        res.status(500).json({ success:false,error: "Server error" });
      }
    };

    
    const withdrawMoney = async (req,res) => {
        try {
            const userId = req.session.user;
            const {amount} = req.body;
    
            if (!amount || amount <= 0) {
                return res.status(400).json({ success:false,message: "Invalid amount" });
              }
    
              let wallet = await Wallet.findOne({ userId });
    
              if(wallet.balance<amount){
                return res.status(400).json({ success:false,message: `you only have ₹ ${wallet.balance} in your wallet!`});
              }
          if (!wallet) {
            return res.status(400).json({ success:false,message: "Wallet not Found" });
          }
    
          wallet.balance -= parseInt(amount);
          wallet.transactions.push({ amount, type: "debit", description: "Withdrawal" });
    
          await wallet.save();
          res.status(200).json({success:true, message: "Amount will be credited to your account"});
            
        } catch (error) {
            console.log(error)
        }
        
    }



module.exports={
    loadWallet,
    createOrder,
    verifyPayment,
    withdrawMoney,
}
