// ========================================
// Supermarket Management System - Main Application File
// ========================================

// Import required modules
const express = require('express');  // Express framework
const mysql = require('mysql2');  // MySQL database driver
const session = require('express-session');  // Session management
const flash = require('connect-flash');  // Flash messages (for displaying temporary notifications)
const multer = require('multer');  // File upload handling
const productController = require('./controllers/productControllers'); // Product controller (MVC pattern)
const app = express();  // Create Express application instance

// ========================================
// File Upload Configuration (Multer)
// ========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Set file save directory to public/images
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);  // Save with original filename
    }
});

const upload = multer({ storage: storage });  // Create multer instance

// ========================================
// Database Connection Configuration
// ========================================
const connection = mysql.createConnection({
    host: 'localhost',  // Database host address
    user: 'root',  // Database username
    password: 'Republic_C207',  // Database password
    database: 'c372_supermarketdb'  // Database name
});

// Connect to MySQL database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// ========================================
// Express Application Configuration
// ========================================
// Set view engine to EJS
app.set('view engine', 'ejs');

// Enable static file serving (CSS, JS, images, etc.)
app.use(express.static('public'));

// Enable form data parsing (for handling POST requests)
app.use(express.urlencoded({
    extended: false  // Use querystring library for parsing
}));

// ========================================
// Session and Flash Message Middleware
// ========================================
// Configure session middleware
app.use(session({
    secret: 'secret',  // Session encryption key
    resave: false,  // Don't force save unmodified sessions
    saveUninitialized: true,  // Save uninitialized sessions
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }  // Session validity: 7 days
}));

// Enable flash messages (for passing one-time messages between pages)
app.use(flash());

// ========================================
// Custom Middleware Functions
// ========================================

/**
 * Check if user is logged in
 * If not logged in, redirect to login page
 */
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();  // Logged in, continue execution
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');  // Not logged in, redirect to login page
    }
};

/**
 * Check if user is an administrator
 * If not admin, deny access and redirect to shopping page
 */
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();  // Is admin, continue execution
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');  // Not admin, redirect to shopping page
    }
};

/**
 * Registration form validation middleware
 * Validates user registration data submission
 */
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    // Check if all fields are filled
    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }

    // Validate password length: must be at least 6 characters
    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters long');
        req.flash('formData', req.body);  // Save form data for redisplay
        return res.redirect('/register');
    }

    // Validate contact number length: must be exactly 8 digits
    if (contact.length !== 8) {
        req.flash('error', 'Contact number must be exactly 8 digits');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    // Validate contact number format: must contain only digits
    if (!/^\d{8}$/.test(contact)) {
        req.flash('error', 'Contact number must contain only digits');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    next();  // Validation passed, continue execution
};

// Import cart and order controllers
const cartControllers = require('./controllers/cartControllers');
const orderControllers = require('./controllers/orderControllers');

// ========================================
// Route Definitions
// ========================================

// Home page route
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });  // Render home page, pass user info
});

// ========================================
// Product Related Routes
// ========================================

// Inventory management page (admin only)
app.get('/inventory', checkAuthenticated, checkAdmin, productController.listAll);

// Shopping page (accessible to both regular users and admins)
app.get('/shopping', checkAuthenticated, productController.listAll);

// ========================================
// User Authentication Related Routes
// ========================================

// Display registration page
app.get('/register', (req, res) => {
    res.render('register', { 
        messages: req.flash('error'),  // Get error messages
        formData: req.flash('formData')[0]  // Get previously filled form data
    });
});

// Handle user registration
app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, address, contact, role } = req.body;

    // Insert new user into database, password encrypted with SHA1
    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    connection.query(sql, [username, email, password, address, contact, role], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');  // Registration successful, redirect to login page
    });
});

// Display login page
app.get('/login', (req, res) => {
    res.render('login', { 
        messages: req.flash('success'),  // Get success messages
        errors: req.flash('error')  // Get error messages
    });
});

// Handle user login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate if email and password are filled
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    // Query database to validate user credentials (password encrypted with SHA1)
    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length > 0) {
            // Login successful
            req.session.user = results[0];  // Store user info in session
            req.flash('success', 'Login successful!');
            // Redirect to different pages based on user role
            if (req.session.user.role == 'user')
                res.redirect('/shopping');  // Regular user redirects to shopping page
            else
                res.redirect('/inventory');  // Admin redirects to inventory management page
        } else {
            // Login failed: invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();  // Destroy session
    res.redirect('/');  // Redirect to home page
});

// ========================================
// Shopping Cart Related Routes
// ========================================

// Add product to cart
app.post('/add-to-cart/:id', checkAuthenticated, cartControllers.add);

// View cart
app.get('/cart', checkAuthenticated, cartControllers.list);

// Delete product from cart
app.post('/cart/delete/:productId', checkAuthenticated, cartControllers.delete);

//  新增：更新购物车商品数量
app.post('/cart/update/:productId', checkAuthenticated, cartControllers.update);
// ========================================
// Order Related Routes
// ========================================

// Checkout (create order)
app.post('/checkout', checkAuthenticated, orderControllers.checkout);

// View user's own order list
app.get('/orders', checkAuthenticated, orderControllers.listUserOrders);

// View order details
app.get('/order/:id', checkAuthenticated, orderControllers.viewOrder);

// Admin view all orders
app.get('/admin/orders', checkAuthenticated, checkAdmin, orderControllers.listAllOrders);

// Admin update order status
app.post('/admin/order/:id/status', checkAuthenticated, checkAdmin, orderControllers.updateStatus);

// Admin delete order
app.get('/admin/order/:id/delete', checkAuthenticated, checkAdmin, orderControllers.deleteOrder);

// View product details by ID
app.get('/product/:id', checkAuthenticated, productController.getById);

// Display add product form (admin only)
app.get('/addProduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', { 
        user: req.session.user,
        messages: req.flash()  // Get all flash messages
    });
});

// Add product (admin only, supports image upload)
app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), productController.add);

// Display update product form (admin only)
app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, productController.showUpdateForm);

// Update product (admin only, supports image upload)
app.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), productController.update);

// Delete product (admin only)
app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, productController.delete);

// ========================================
// Start Server
// ========================================
const PORT = process.env.PORT || 3000;  // Get port from environment variable, default to 3000
app.listen(PORT, () => console.log(`Server running on URL address: http://localhost:${PORT}/`));
