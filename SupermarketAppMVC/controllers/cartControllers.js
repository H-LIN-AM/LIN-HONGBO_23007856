// ========================================
// Cart Controller
// Handles all shopping cart-related business logic
// ========================================
const cartModel = require('../models/cart');  // Cart model
const db = require('../db');  // Database connection

const cartController = {
  /**
   * Display shopping cart
   * Get current user's cart contents and render page
   */
  list(req, res) {
    const cart = cartModel.getCart(req.session);  // Get cart data from session
    const user = req.session.user || { username: 'Guest', role: 'user' };  // Get user info
    res.render('cart', { 
      cart, 
      user,
      messages: req.flash()  // Get flash messages
    });
  },

  /**
   * Add product to cart
   * Validate stock and add product to user's cart
   */
  add(req, res) {
    const productId = parseInt(req.params.id);  // Get product ID from URL
    const quantity = parseInt(req.body.quantity) || 1;  // Get quantity, default to 1

    // Query product information
    db.query('SELECT * FROM products WHERE id = ?', [productId], (error, results) => {
      if (error) {
        console.error('Error fetching product:', error);
        req.flash('error', 'Failed to add product to cart');
        return res.redirect('/shopping');
      }

      // Check if product exists
      if (results.length === 0) {
        req.flash('error', 'Product not found');
        return res.redirect('/shopping');
      }

      const product = results[0];

      // Check if stock is sufficient
      if (product.quantity < quantity) {
        req.flash('error', 'Not enough stock available');
        return res.redirect('/shopping');
      }

      // Add product to cart
      cartModel.addItem(req.session, product, quantity);
      req.flash('success', 'Product added to cart');
      res.redirect('/cart');  // Redirect to cart page
    });
  },

  /**
   * Delete product from cart
   * Remove specified product item
   */
  delete(req, res) {
    const productId = parseInt(req.params.productId);  // Get product ID from URL
    cartModel.removeItem(req.session, productId);  // Remove product from cart
    req.flash('success', 'Product removed from cart');
    res.redirect('/cart');  // Return to cart page
  },

  /**
   * Update product quantity in cart
   * Support + / - buttons and manual quantity update
   */
  update(req, res) {
    const productId = parseInt(req.params.productId);  // Get product ID from URL
    const action = req.body.action;                    // increase / decrease / undefined
    const inputQty = parseInt(req.body.quantity);      // Quantity from input box

    const cart = cartModel.getCart(req.session);       // Ensure cart exists
    const item = cart.find(i => i.productId === productId);

    if (!item) {
      req.flash('error', 'Item not found in cart');
      return res.redirect('/cart');
    }

    if (action === 'increase') {
      // "+" button
      item.quantity += 1;
    } else if (action === 'decrease') {
      // "-" button, but minimum 1
      if (item.quantity > 1) {
        item.quantity -= 1;
      }
    } else {
      // "Update" button: use the value in the input
      if (!isNaN(inputQty) && inputQty >= 1) {
        item.quantity = inputQty;
      }
    }

    req.flash('success', 'Cart updated');
    res.redirect('/cart');
  }
};

// Export cart controller
module.exports = cartController;
