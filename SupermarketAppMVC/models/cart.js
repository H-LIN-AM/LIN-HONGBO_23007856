// ========================================
// Cart Model
// Handles shopping cart business logic (session-based storage)
// ========================================

const cartModel = {
  /**
   * Get shopping cart
   * Ensure cart exists and return it
   * @param {Object} session - Session object
   * @returns {Array} Cart items array
   */
  getCart(session) {
    if (!session.cart) {
      session.cart = [];  // Initialize empty cart
    }
    return session.cart;
  },

  /**
   * Add or update product in cart
   * If product exists, increase quantity; otherwise add new item
   * @param {Object} session - Session object
   * @param {Object} product - Product object
   * @param {Number} quantity - Quantity
   */
  addItem(session, product, quantity) {
    if (!session.cart) {
      session.cart = [];  // Initialize cart
    }
    const cart = session.cart;

    const productId = product.id;

    // Check if product already exists in cart
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
      // Product exists, increase quantity
      existingItem.quantity += quantity;
    } else {
      // Product doesn't exist, add new item
      cart.push({
        productId: product.id,
        productName: product.productName,
        price: product.price,
        quantity: quantity,
        image: product.image
      });
    }
  },

  /**
   * Remove product from cart
   * @param {Object} session - Session object
   * @param {Number} productId - Product ID to remove
   */
  removeItem(session, productId) {
    if (!session.cart) return;  // Cart doesn't exist, return directly
    // Filter out the specified product
    session.cart = session.cart.filter(item => item.productId !== productId);
  }
};

// Export cart model
module.exports = cartModel;
