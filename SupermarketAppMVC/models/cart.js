// filepath: models/cart.js

const cartModel = {
  // Ensure cart exists and return it
  getCart(session) {
    if (!session.cart) {
      session.cart = [];
    }
    return session.cart;
  },

  // Add/update item in cart
  addItem(session, product, quantity) {
    if (!session.cart) {
      session.cart = [];
    }
    const cart = session.cart;

    const productId = product.id;

    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        productId: product.id,
        productName: product.productName,
        price: product.price,
        quantity: quantity,
        image: product.image
      });
    }
  },

  // Remove item from cart
  removeItem(session, productId) {
    if (!session.cart) return;
    session.cart = session.cart.filter(item => item.productId !== productId);
  }
};

module.exports = cartModel;
