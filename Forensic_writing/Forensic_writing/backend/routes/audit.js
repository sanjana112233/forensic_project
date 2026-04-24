const express = require('express');
const AuditLog = require('../models/AuditLog');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get audit logs
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      severity,
      dateFrom,
      dateTo,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (severity) query.severity = severity;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (req.user.role === 'admin') {
      if (userId) query.userId = userId;
    } else {
      query.userId = req.userId;
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'username firstName lastName email')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


// ✅ FIXED USER ROUTES
router.get('/user', auth, async (req, res) => {
  try {
    const targetUserId = req.userId;
    const { limit = 50 } = req.query;

    const logs = await AuditLog.getUserActivity(targetUserId, parseInt(limit));
    res.json({ logs });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    if (req.user.role !== 'admin' && targetUserId !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { limit = 50 } = req.query;

    const logs = await AuditLog.getUserActivity(targetUserId, parseInt(limit));
    res.json({ logs });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// System summary
router.get('/system/summary', adminAuth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
    }

    const summary = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$createdAt' }
        }
      }
    ]);

    res.json({ summary });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Security logs
router.get('/security', adminAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ logs });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ✅ FIXED LOGIN HISTORY
router.get('/login-history', auth, async (req, res) => {
  try {
    const targetUserId = req.userId;
    const { limit = 20 } = req.query;

    const loginHistory = await AuditLog.find({
      userId: targetUserId,
      action: { $in: ['login', 'logout'] }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ loginHistory });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/login-history/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    if (req.user.role !== 'admin' && targetUserId !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { limit = 20 } = req.query;

    const loginHistory = await AuditLog.find({
      userId: targetUserId,
      action: { $in: ['login', 'logout'] }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ loginHistory });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;