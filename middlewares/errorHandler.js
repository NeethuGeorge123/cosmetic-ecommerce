
function errorHandler(err, req, res, next) {
    console.error("Error:", err.message || err);
  
    if (res.headersSent) {
      return next(err);
    }
  
    
    if (req.originalUrl.startsWith("/api") || req.xhr) {
      return res.status(500).json({ status: false, message: err.message || "Server error" });
    }
  
    
    res.status(500).render("user/page-404", { error: err.message || "Something went wrong" });
  }
  
  module.exports = errorHandler;
  