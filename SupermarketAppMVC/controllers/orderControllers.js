// ========================================
// Order Controller
// Handles all order-related business logic
// Now uses database-based cart for data persistence
// ========================================
const Order = require('../models/order');  // Order model
const cartModel = require('../models/cart');  // Cart model

/**
 * Checkout function
 * Convert shopping cart items from database into an order
 */
function checkout(req, res) {
    const user = req.session.user;  // Get current user
    
    console.log('=== Checkout Process Started ===');
    console.log('User ID:', user.id);
    
    // Get cart data from database
    cartModel.getCart(user.id, (err, cart) => {
        if (err) {
            console.error('Error fetching cart:', err);
            req.flash('error', 'Error loading cart. Please try again.');
            return res.redirect('/cart');
        }
        
        console.log('Cart items:', cart.length);
        
        // Check if cart is empty
        if (!cart || cart.length === 0) {
            console.log('Cart is empty, redirecting...');
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }
        
        // Validate cart items
        for (let item of cart) {
            if (!item.productId || !item.price || !item.quantity) {
                console.error('Invalid cart item:', item);
                req.flash('error', 'Invalid cart data. Please try again.');
                return res.redirect('/cart');
            }
        }
        
        // Calculate order total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        console.log('Order total:', total);
        
        // Prepare order items data
        const items = cart.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price
        }));
        
        console.log('Creating order with items:', JSON.stringify(items));
        
        // Create order
        Order.create(user.id, total, items, (err, result) => {
            if (err) {
                // Order creation failed, log error details
                console.error('=== Error creating order ===');
                console.error('Error details:', err);
                console.error('Error message:', err.message);
                console.error('Error code:', err.code);
                console.error('SQL State:', err.sqlState);
                req.flash('error', 'Failed to create order. Please try again or contact support.');
                return res.redirect('/cart');
            }
            
            console.log('Order created successfully:', result);
            
            // Clear cart from database after successful order
            cartModel.clearCart(user.id, (clearErr) => {
                if (clearErr) {
                    console.error('Error clearing cart:', clearErr);
                    // Still continue even if clearing fails
                }
                
                req.flash('success', 'Order placed successfully!');
                res.redirect('/orders');  // Redirect to orders list page
            });
        });
    });
}

/**
 * View user's own order list
 * Display all orders for the current user
 */
function listUserOrders(req, res) {
    const user = req.session.user;  // Get current user
    
    // Query all orders for the user
    Order.getByUserId(user.id, (err, orders) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.render('orders', { orders: [], error: 'Failed to load orders', user });
        }
        
        res.render('orders', { orders, error: null, user, messages: req.flash() });
    });
}

/**
 * View all orders (admin only)
 * Admin can view all orders from all users in the system
 */
function listAllOrders(req, res) {
    const user = req.session.user;  // Get current user (should be admin)
    
    // Query all orders
    Order.getAll((err, orders) => {
        if (err) {
            console.error('Error fetching all orders:', err);
            return res.render('adminOrders', { orders: [], error: 'Failed to load orders', user });
        }
        
        res.render('adminOrders', { orders, error: null, user });
    });
}

/**
 * View order details
 * Display detailed information for a single order
 * Users can only view their own orders, admins can view all orders
 */
function viewOrder(req, res) {
    const user = req.session.user;  // Get current user
    const orderId = parseInt(req.params.id, 10);  // Get order ID from URL
    
    // Validate order ID
    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/orders');
    }
    
    // Query order information
    Order.getById(orderId, (err, order) => {
        if (err) {
            console.error('Error fetching order:', err);
            req.flash('error', 'Failed to load order');
            return res.redirect('/orders');
        }
        
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }
        
        // Check if user has permission to view this order (order owner or admin)
        if (user.role !== 'admin' && order.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }
        
        res.render('orderDetails', { order, error: null, user });
    });
}

/**
 * Update order status (admin only)
 * Admin can change order processing status (e.g., pending, shipped, completed, etc.)
 */
function updateStatus(req, res) {
    const orderId = parseInt(req.params.id, 10);  // Get order ID from URL
    const status = req.body.status;  // Get new status
    
    // Validate request parameters
    if (Number.isNaN(orderId) || !status) {
        req.flash('error', 'Invalid request');
        return res.redirect('/admin/orders');
    }
    
    // Update order status
    Order.updateStatus(orderId, status, (err) => {
        if (err) {
            console.error('Error updating order status:', err);
            req.flash('error', 'Failed to update order status');
        } else {
            req.flash('success', 'Order status updated successfully');
        }
        res.redirect('/admin/orders');  // Return to admin orders page
    });
}

/**
 * Delete order (admin only)
 * Admin can delete order records
 */
function deleteOrder(req, res) {
    const orderId = parseInt(req.params.id, 10);  // Get order ID from URL
    
    // Validate order ID
    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/admin/orders');
    }
    
    // Delete order
    Order.delete(orderId, (err) => {
        if (err) {
            console.error('Error deleting order:', err);
            req.flash('error', 'Failed to delete order');
        } else {
            req.flash('success', 'Order deleted successfully');
        }
        res.redirect('/admin/orders');  // Return to admin orders page
    });
}

/**
 * Print order invoice
 * Display order details in print-friendly format
 */
function printOrder(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.id, 10);
    
    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/orders');
    }
    
    // Get order details
    Order.getById(orderId, (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }
        
        // Check permissions
        if (user.role !== 'admin' && order.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }
        
        // Render invoice template for printing
        res.render('orderInvoice', { 
            order, 
            items: order.items || [],
            user: user,
            autoPrint: false  // Don't auto-print, let user click print button
        });
    });
}

/**
 * Download order invoice as PDF
 * Opens print dialog with auto-print enabled
 */
function downloadPDF(req, res) {
    const user = req.session.user;
    const orderId = parseInt(req.params.id, 10);
    
    if (Number.isNaN(orderId)) {
        req.flash('error', 'Invalid order ID');
        return res.redirect('/orders');
    }
    
    // Get order details
    Order.getById(orderId, (err, order) => {
        if (err || !order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }
        
        // Check permissions
        if (user.role !== 'admin' && order.user_id !== user.id) {
            req.flash('error', 'Access denied');
            return res.redirect('/orders');
        }
        
        // Render invoice template with auto-print enabled
        res.render('orderInvoice', { 
            order, 
            items: order.items || [],
            user: user,
            autoPrint: true  // Auto-open print dialog for PDF download
        });
    });
}

// ========================================
// Export all controller functions
// ========================================
module.exports = {
    checkout,          // Checkout function
    listUserOrders,    // View user orders
    listAllOrders,     // View all orders (admin)
    viewOrder,         // View order details
    updateStatus,      // Update order status (admin)
    deleteOrder,       // Delete order (admin)
    printOrder,        // Print order invoice
    downloadPDF        // Download order as PDF
};
