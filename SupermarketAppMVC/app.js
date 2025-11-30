// ========================================
// Supermarket Management System - Main Application File
// ========================================

// Import required modules
require('dotenv').config();  // Load environment variables
const express = require('express');  // Express framework
const mysql = require('mysql2');  // MySQL database driver
const session = require('express-session');  // Session management
const flash = require('connect-flash');  // Flash messages (for displaying temporary notifications)
const multer = require('multer');  // File upload handling
const nodemailer = require('nodemailer'); // <-- NEW: for sending email
const randomstring = require('randomstring'); // <-- NEW: for OTP
const productController = require('./controllers/productControllers'); // Product controller (MVC pattern)

// Import middleware
const { checkAuthenticated, checkAdmin, validateRegistration, validateLogin } = require('./middleware');

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
    host: process.env.DB_HOST || 'localhost',  // Database host address
    user: process.env.DB_USER || 'root',  // Database username
    password: process.env.DB_PASSWORD || 'Republic_C207',  // Database password
    database: process.env.DB_NAME || 'c372_supermarketdb'  // Database name
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
// OTP + Email Helper (NEW)
// ========================================

// Simple in-memory cache: { email: { code, expiresAt } }
const otpCache = {};

// 保存 OTP，默认 3 分钟有效
function setOTP(email, otp, ttl = 3 * 60 * 1000) {
    otpCache[email] = { code: otp, expiresAt: Date.now() + ttl };

    // 到时间自动清除
    setTimeout(() => {
        if (otpCache[email] && otpCache[email].expiresAt <= Date.now()) {
            delete otpCache[email];
        }
    }, ttl + 1000);
}

// 生成 6 位数字 OTP
function generateOTP() {
    return randomstring.generate({ length: 6, charset: 'numeric' });
}

// 创建 Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 发送 OTP 邮件
async function sendOTP(email, otp) {
    return transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'HB Mart - Email Verification OTP',
        html: `<h3>Your OTP is: <b>${otp}</b></h3>
               <p>This code will expire in 3 minutes.</p>`
    });
}

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
// Controllers
// ========================================

// Import cart, order and user controllers
const cartControllers = require('./controllers/cartControllers');
const orderControllers = require('./controllers/orderControllers');
const userControllers = require('./controllers/userControllers');

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

// Handle user registration + send OTP
app.post('/register', validateRegistration, async (req, res) => {
    const { username, email, password, address, contact, role } = req.body;

    try {
        // 1. Check if email already exists
        const checkSql = 'SELECT id FROM users WHERE email = ?';
        connection.query(checkSql, [email], async (checkErr, checkResults) => {
            if (checkErr) {
                console.error(checkErr);
                req.flash('error', 'System error, please try again.');
                req.flash('formData', req.body);
                return res.redirect('/register');
            }

            if (checkResults.length > 0) {
                req.flash('error', 'Email already registered');
                req.flash('formData', req.body);
                return res.redirect('/register');
            }

            // 2. Insert new user with verified = 0
            //    ⚠️ DB 里需要有 verified TINYINT(1) DEFAULT 0
            const insertSql = 'INSERT INTO users (username, email, password, address, contact, role, verified) VALUES (?, ?, SHA1(?), ?, ?, ?, ?)';
            connection.query(
                insertSql,
                [username, email, password, address, contact, role, 0],
                async (insertErr, result) => {
                    if (insertErr) {
                        console.error(insertErr);
                        req.flash('error', 'Error creating user, please try again.');
                        req.flash('formData', req.body);
                        return res.redirect('/register');
                    }

                    // 3. Generate OTP & cache it
                    const otp = generateOTP();
                    setOTP(email, otp);

                    // 4. Send OTP email
                    try {
                        await sendOTP(email, otp);
                        // 跳去 OTP 页面
                        return res.redirect(`/otp?email=${encodeURIComponent(email)}&sent=1`);
                    } catch (mailErr) {
                        console.error('Error sending OTP email:', mailErr);
                        req.flash('error', 'Unable to send OTP email. Please try again later.');
                        return res.redirect('/register');
                    }
                }
            );
        });
    } catch (e) {
        console.error(e);
        req.flash('error', 'Unexpected error.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
});

// Display login page
app.get('/login', (req, res) => {
    res.render('login', { 
        messages: req.flash('success'),  // Get success messages
        errors: req.flash('error')  // Get error messages
    });
});

// Handle user login (with verified check)
app.post('/login', validateLogin, (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error(err);
            req.flash('error', 'System error, please try again.');
            return res.redirect('/login');
        }

        if (results.length === 0) {
            // Login failed: invalid credentials
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const user = results[0];

        // NEW: check verified flag
        // ⚠️ 需要 users 表有 verified 字段（0/1）
        if (!user.verified) {
            req.flash('error', 'Please verify your email before logging in.');
            return res.redirect('/login');
        }

        // Login successful
        req.session.user = user;  // Store user info in session
        req.flash('success', 'Login successful!');

        // Redirect to different pages based on user role
        if (req.session.user.role == 'user')
            res.redirect('/shopping');  // Regular user redirects to shopping page
        else
            res.redirect('/inventory');  // Admin redirects to inventory management page
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();  // Destroy session
    res.redirect('/');  // Redirect to home page
});

// ========================================
// OTP Routes (NEW)
// ========================================

// Show OTP page
app.get('/otp', (req, res) => {
    res.render('otp', {
        query: req.query || {}
    });
});

// Request / resend OTP manually
app.post('/reqOTP', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.redirect('/otp?error=Email+is+required');
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    connection.query(sql, [email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.redirect('/otp?error=Server+error');
        }

        if (results.length === 0) {
            return res.redirect('/otp?error=Email+not+found');
        }

        const user = results[0];

        if (user.verified) {
            // Already verified
            return res.redirect('/login');
        }

        const otp = generateOTP();
        setOTP(email, otp);

        try {
            await sendOTP(email, otp);
            return res.redirect(`/otp?email=${encodeURIComponent(email)}&sent=1`);
        } catch (mailErr) {
            console.error('Error sending OTP email:', mailErr);
            return res.redirect(`/otp?email=${encodeURIComponent(email)}&error=Unable+to+send+OTP`);
        }
    });
});

// Verify OTP
app.post('/verifyOTP', (req, res) => {
    const { email, otp } = req.body;

    const record = otpCache[email];

    if (!record || Date.now() > record.expiresAt) {
        return res.redirect(`/otp?email=${encodeURIComponent(email)}&error=OTP+expired+or+invalid`);
    }

    if (record.code !== otp) {
        return res.redirect(`/otp?email=${encodeURIComponent(email)}&error=Invalid+OTP`);
    }

    // OTP OK, remove cache
    delete otpCache[email];

    // Update user as verified
    const sql = 'UPDATE users SET verified = 1 WHERE email = ?';
    connection.query(sql, [email], (err, result) => {
        if (err) {
            console.error(err);
            return res.redirect(`/otp?email=${encodeURIComponent(email)}&error=Server+error`);
        }

        // 成功后让用户去登录页
        req.flash('success', 'Email verified successfully! Please log in.');
        return res.redirect('/login');
    });
});

// ========================================
// Shopping Cart Related Routes
// ========================================

// Add product to cart
app.post('/add-to-cart/:id', checkAuthenticated, cartControllers.add);

// View cart
app.get('/cart', checkAuthenticated, cartControllers.list);

// Delete product from cart
app.get('/cart/remove/:productId', checkAuthenticated, cartControllers.delete);
app.post('/cart/delete/:productId', checkAuthenticated, cartControllers.delete);

//  新增：更新购物车商品数量
app.post('/cart/update/:productId', checkAuthenticated, cartControllers.update);

// 清空购物车
app.get('/cart/clear', checkAuthenticated, cartControllers.clearAll);

// ========================================
// Order Related Routes
// ========================================

// Checkout (create order)
app.post('/checkout', checkAuthenticated, orderControllers.checkout);

// View user's own order list
app.get('/orders', checkAuthenticated, orderControllers.listUserOrders);

// View order details
app.get('/order/:id', checkAuthenticated, orderControllers.viewOrder);

// Print order invoice
app.get('/order/:id/print', checkAuthenticated, orderControllers.printOrder);

// Download order as PDF
app.get('/order/:id/pdf', checkAuthenticated, orderControllers.downloadPDF);

// Admin view all orders
app.get('/admin/orders', checkAuthenticated, checkAdmin, orderControllers.listAllOrders);

// Admin update order status
app.post('/admin/order/:id/status', checkAuthenticated, checkAdmin, orderControllers.updateStatus);

// Admin delete order
app.get('/admin/order/:id/delete', checkAuthenticated, checkAdmin, orderControllers.deleteOrder);

// ========================================
// User Management Routes (Admin only)
// ========================================

// View all users (admin only)
app.get('/admin/users', checkAuthenticated, checkAdmin, userControllers.listAll);

// Display create admin form (admin only)
app.get('/admin/users/create', checkAuthenticated, checkAdmin, userControllers.showCreateAdminForm);

// Create new admin user (admin only)
// 可以保持不变，DB 里 verified 默认 1 或 0 都行，看你设计
app.post('/admin/users/create', checkAuthenticated, checkAdmin, userControllers.createAdmin);

// Display edit user form (admin only)
app.get('/admin/users/edit/:id', checkAuthenticated, checkAdmin, userControllers.showEditForm);

// Update user (admin only)
app.post('/admin/users/edit/:id', checkAuthenticated, checkAdmin, userControllers.update);

// Delete user (admin only)
app.get('/admin/users/delete/:id', checkAuthenticated, checkAdmin, userControllers.delete);

// ========================================
// Product Related Routes
// ========================================

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
