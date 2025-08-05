const Wallet=require("../models/walletSchema")
//const Wallet = require("../models/walletSchema");

async function refundToWallet(userId, amount, orderId, description = "Refund") {
  if (!amount || amount <= 0) return null;

  let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    wallet = new Wallet({
      userId,
      balance: amount,
      transactions: [{
        amount,
        type: "credit",
        description,
        orderId
      }]
    });
  } else {
    wallet.balance += amount;
    wallet.transactions.push({
      amount,
      type: "credit",
      description,
      orderId
    });
  }

  await wallet.save();
  return wallet;
}

module.exports = refundToWallet;
