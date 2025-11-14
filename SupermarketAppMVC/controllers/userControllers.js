const userModel = require('../models/user');

const usersController = {
  // List all users
  async list(req, res) {
    try {
      const users = await userModel.getAll();
      return res.status(200).json(users);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // Get a single user by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const user = await userModel.getById(id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json(user);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // Add a new user
  async add(req, res) {
    try {
      const payload = req.body;
      const created = await userModel.create(payload);
      return res.status(201).json(created);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // Update an existing user by ID
  async update(req, res) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const updated = await userModel.update(id, payload);
      if (!updated) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // Delete a user by ID
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await userModel.delete(id);
      if (!deleted) return res.status(404).json({ message: 'User not found' });
      return res.status(204).end();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
};

module.exports = usersController;