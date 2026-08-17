

const Messages = {
    CART: {
      PRODUCT_NOT_AVAILABLE: "Product not available",
      CATEGORY_BLOCKED: "Product category is blocked",
      PURCHASE_LIMIT: "Purchase limit reached",
      NO_MORE_STOCK: "No more stock available",
      PRODUCT_ADDED: "Product added to cart",
      CART_ITEM_NOT_FOUND: "Cart item not found",
      PRODUCT_NOT_IN_CART: "Product not found in cart",
      MIN_QUANTITY: "Minimum quantity is 1",
      EXCEEDS_STOCK: "Exceeds available stock",
      PRODUCT_REMOVED: "Product removed from cart",
      CART_EMPTY: "Your cart is empty",
      STOCK_NOT_AVAILABLE: "Some products in your cart are not available in the requested quantity.",
      PRODUCT_UNAVAILABLE: (name) => `"${name}" is no longer available.`,
    OUT_OF_STOCK: (name) => `"${name}" is out of stock.`,
    STOCK_LIMITED: (name, available, requested) =>
        `"${name}" has only ${available} unit${available > 1 ? 's' : ''} left, but you have ${requested} in your cart.`,
    },
    GENERAL: {
      SERVER_ERROR: "Server error"
    }
  };
  
  module.exports = Messages;
  