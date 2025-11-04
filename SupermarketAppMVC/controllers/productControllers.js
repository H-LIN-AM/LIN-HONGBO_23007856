// controllers/productControllers.js
const Product = require('../models/products');

// Render inventory for admin, shopping for users
function listAll(req, res) {
  const user = req.session.user || null;
  const view = user && user.role === 'admin' ? 'inventory' : 'shopping';
  Product.getAll((err, results) => {
    if (err) {
      return res.status(500).render(view, { products: [], error: 'Database error', user });
    }
    return res.render(view, { products: results, error: null, user });
  });
}

// Product details page
function getById(req, res) {
  const user = req.session.user || null;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).render('product', { product: null, error: 'Invalid product ID', user });
  }
  Product.getById(id, (err, product) => {
    if (err)  return res.status(500).render('product', { product: null, error: 'Database error', user });
    if (!product) return res.status(404).render('product', { product: null, error: 'Product not found', user });
    return res.render('product', { product, error: null, user });
  });
}

// Add product (maps form "name" -> productName, uses req.file.filename)
function add(req, res) {
  const user = req.session.user || null;
  const productName = req.body.productName || req.body.name;
  const quantity = parseInt(req.body.quantity, 10);
  const price = parseFloat(req.body.price);
  const image = req.file ? req.file.filename : null;

  if (!productName || Number.isNaN(quantity) || Number.isNaN(price)) {
    return res.status(400).render('addProduct', {
      user,
      error: 'Missing or invalid fields',
      product: { productName, quantity, price, image }
    });
  }

  Product.add({ productName, quantity, price, image }, (err) => {
    if (err) {
      return res.status(500).render('addProduct', {
        user,
        error: 'Database error',
        product: { productName, quantity, price, image }
      });
    }
    return res.redirect('/inventory');
  });
}

// GET edit form
function showUpdateForm(req, res) {
  const user = req.session.user || null;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).render('updateProduct', { product: null, error: 'Invalid product ID', user });
  }
  Product.getById(id, (err, product) => {
    if (err)  return res.status(500).render('updateProduct', { product: null, error: 'Database error', user });
    if (!product) return res.status(404).render('updateProduct', { product: null, error: 'Product not found', user });
    return res.render('updateProduct', { product, error: null, user });
  });
}

// POST edit (keep old image if none uploaded)
function update(req, res) {
  const user = req.session.user || null;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).render('updateProduct', { product: null, error: 'Invalid product ID', user });
  }

  const productName = req.body.productName || req.body.name;
  const quantity = parseInt(req.body.quantity, 10);
  const price = parseFloat(req.body.price);
  const image = req.file ? req.file.filename : (req.body.currentImage || null);

  const product = { productName, quantity, price, image };

  if (!productName || Number.isNaN(quantity) || Number.isNaN(price)) {
    return res.status(400).render('updateProduct', { product: { id, ...product }, error: 'Missing or invalid fields', user });
  }

  Product.update(id, product, (err, result) => {
    if (err) {
      return res.status(500).render('updateProduct', { product: { id, ...product }, error: 'Database error', user });
    }
    if (result && result.affectedRows === 0) {
      return res.status(404).render('updateProduct', { product: { id, ...product }, error: 'Product not found', user });
    }
    return res.redirect(`/product/${id}`);
  });
}

// Delete product
function remove(req, res) {
  const user = req.session.user || null;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).render('inventory', { products: [], error: 'Invalid product ID', user });
  }

  Product.delete(id, (err, result) => {
    if (err) {
      return res.status(500).render('inventory', { products: [], error: 'Database error', user });
    }
    if (result && result.affectedRows === 0) {
      return res.status(404).render('inventory', { products: [], error: 'Product not found', user });
    }
    return res.redirect('/inventory');
  });
}

// Export ONCE, after all functions are defined
module.exports = {
  listAll,
  getById,
  add,
  showUpdateForm,
  update,
  delete: remove
};
