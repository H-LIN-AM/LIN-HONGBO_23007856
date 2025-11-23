// ========================================
// User Controller
// Handles all user-related business logic
// Provides RESTful API endpoints
// ========================================
const userModel = require('../models/user');  // User model

const usersController = {
  /**
   * Get all users list
   * Return user data in JSON format
   */
  async list(req, res) {
    try {
      const users = await userModel.getAll();  // Query all users
      return res.status(200).json(users);  // Return user list
    } catch (err) {
      return res.status(500).json({ error: err.message });  // Return error message
    }
  },

  /**
   * Get single user by ID
   * Return specified user's detailed information
   */
  async getById(req, res) {
    try {
      const { id } = req.params;  // Get user ID from URL
      const user = await userModel.getById(id);  // Query user information
      if (!user) return res.status(404).json({ message: 'User not found' });  // User does not exist
      return res.status(200).json(user);  // Return user information
    } catch (err) {
      return res.status(500).json({ error: err.message });  // Return error message
    }
  },

  /**
   * Add new user
   * Create new user account
   */
  async add(req, res) {
    try {
      const payload = req.body;  // Get user data from request body
      const created = await userModel.create(payload);  // Create user
      return res.status(201).json(created);  // Return created user information
    } catch (err) {
      return res.status(500).json({ error: err.message });  // Return error message
    }
  },

  /**
   * Update user information
   * Update specified user's data by ID
   */
  async update(req, res) {
    try {
      const { id } = req.params;  // Get user ID from URL
      const payload = req.body;  // Get data to update
      const updated = await userModel.update(id, payload);  // Update user information
      if (!updated) return res.status(404).json({ message: 'User not found' });  // User does not exist
      return res.status(200).json(updated);  // Return updated user information
    } catch (err) {
      return res.status(500).json({ error: err.message });  // Return error message
    }
  },

  /**
   * Delete user
   * Delete specified user by ID
   */
  async delete(req, res) {
    try {
      const { id } = req.params;  // Get user ID from URL
      const deleted = await userModel.delete(id);  // Delete user
      if (!deleted) return res.status(404).json({ message: 'User not found' });  // User does not exist
      return res.status(204).end();  // Return empty response (deletion successful)
    } catch (err) {
      return res.status(500).json({ error: err.message });  // Return error message
    }
  }
};

// Export user controller
module.exports = usersController;