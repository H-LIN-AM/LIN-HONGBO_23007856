// ...existing code...
const db = require('../db');

/**
 * Function-based product model (MVC)
 * Exports methods that accept parameters and a callback (err, result)
 * Table fields assumed: id, productName, quantity, price, image
 */

function getAll(callback) {
    const sql = 'SELECT id, productName, quantity, price, image FROM products';
    db.query(sql, (err, results) => callback(err, results));
}

function getById(id, callback) {
    const sql = 'SELECT id, productName, quantity, price, image FROM products WHERE id = ? LIMIT 1';
    db.query(sql, [id], (err, results) => callback(err, results && results[0] ? results[0] : null));
}

function add(product, callback) {
    const { productName, quantity, price, image } = product;
    const sql = 'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
    db.query(sql, [productName, quantity, price, image], (err, result) => callback(err, result));
}

function updateById(id, product, callback) {
    const { productName, quantity, price, image } = product;
    const sql = 'UPDATE products SET productName = ?, quantity = ?, price = ?, image = ? WHERE id = ?';
    db.query(sql, [productName, quantity, price, image, id], (err, result) => callback(err, result));
}

function deleteById(id, callback) {
    const sql = 'DELETE FROM products WHERE id = ?';
    db.query(sql, [id], (err, result) => callback(err, result));
}

module.exports = {
    getAll,
    getById,
    add,
    update: updateById,
    delete: deleteById
};
// ...existing code...