// filepath: controllers/cartControllers.js
const cartModel = require('../models/cart');
const db = require('../db'); // this should export your MySQL connection

const cartController = {
  // Show cart
  list(req, res) {
    const cart = cartModel.getCart(req.session);
    res.render('cart', { cart, user: req.session.user });
  },

  // Add product to cart
  add(req, res) {
    const productId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    db.query('SELECT * FROM products WHERE id = ?', [productId], (error, results) => {
      if (error) {
        console.error('Error fetching product:', error);
        return res.status(500).send('Database error');
      }

      if (results.length === 0) {
        return res.status(404).send('Product not found');
      }

      const product = results[0];

      cartModel.addItem(req.session, product, quantity);
      res.redirect('/cart');
    });
  },

  // Remove product from cart
  delete(req, res) {
    const productId = parseInt(req.params.productId);
    cartModel.removeItem(req.session, productId);
    res.redirect('/cart');
  }
};

module.exports = cartController;
