const User = require("../../models/userSignupSchema");
const Wallet=require("../../models/walletSchema")
const Order=require("../../models/orderSchema")

const loadWalletHistory = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;
  
      
      const wallets = await Wallet.find({})
        .populate("userId", "name email") 
        .populate("transactions.orderId", "orderId") 
        .lean();
  
      
      let allTransactions = [];
      wallets.forEach(wallet => {
        wallet.transactions.forEach(txn => {
          allTransactions.push({
            transactionId: txn.transactionId,
            userName: wallet.userId?.name || "Unknown",
            userEmail: wallet.userId?.email || "Unknown",
            amount: txn.amount,
            type: txn.type,
            description: txn.description || "-",
            date: txn.date,
            orderId: txn.orderId ? txn.orderId.orderId : "N/A"
          });
        });
      });
  
      
      allTransactions = allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
      const totalTransactions = allTransactions.length;
      const totalPages = Math.ceil(totalTransactions / limit);
      const paginatedTransactions = allTransactions.slice(skip, skip + limit);
  
      res.render("admin/walletHistory", {
        transactions: paginatedTransactions,
        currentPage: page,
        totalPages
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  };
  
  module.exports = { loadWalletHistory };
 