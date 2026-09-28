const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'tralien-police-secure-jwt-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      badgeNumber: user.badgeNumber
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Middleware: Authenticate Admin/Officer
function requireAuth(req, res, next) {
  let token = null;

  // Check Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập quản trị để thực hiện thao tác này.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
  }

  // Check if user still exists and is active
  const user = db.findOne('users', u => u.id === decoded.id && u.isActive);
  if (!user) {
    return res.status(403).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.' });
  }

  req.user = decoded;
  next();
}

// Middleware: Require ADMIN role
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Chức năng chỉ dành cho quản trị viên (Admin).' });
    }
    next();
  });
}

// Helper to mask phone numbers for public display
function maskPhone(phone) {
  if (!phone || phone.length < 7) return '***';
  return phone.slice(0, 4) + '***' + phone.slice(-3);
}

// Helper to mask name for public display (e.g., "Nguyễn Văn Hùng" -> "Nguyễn V*** H***")
function maskName(name) {
  if (!name) return 'Người dân';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0] + '***';
  return parts.map((p, idx) => (idx === 0 ? p : p[0] + '***')).join(' ');
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  requireAuth,
  requireAdmin,
  maskPhone,
  maskName
};
