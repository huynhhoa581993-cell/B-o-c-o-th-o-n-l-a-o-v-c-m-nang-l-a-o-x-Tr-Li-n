const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('./db/database');
const {
  generateToken,
  requireAuth,
  requireAdmin,
  maskPhone,
  maskName
} = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Uploads directory
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${cleanName}-${unique}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.mp4', '.mov', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Định dạng tệp không được hỗ trợ. Chỉ chấp nhận ảnh, pdf, video hoặc tài liệu.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Simple Cookie Parser helper
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(c => {
      const parts = c.trim().split('=');
      if (parts.length === 2) {
        req.cookies[parts[0]] = decodeURIComponent(parts[1]);
      }
    });
  }
  next();
});

// ==========================================
// PUBLIC API ROUTES
// ==========================================

// 1. Get Public Settings
app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: db.getSettings() });
});

// 2. Get Villages List
app.get('/api/villages', (req, res) => {
  const villages = db.find('villages', v => v.isActive !== false);
  res.json({ success: true, data: villages });
});

// 3. Get Village Detail
app.get('/api/villages/:id', (req, res) => {
  const village = db.findOne('villages', v => v.id === req.params.id);
  if (!village) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thôn yêu cầu.' });
  }

  // Get active alerts for this village
  const alerts = db.find('alerts', a => a.isPublished && (a.villageId === village.id || !a.villageId));

  // Get aggregated report count (no sensitive info)
  const reportCount = db.find('reports', r => r.villageId === village.id).length;
  const resolvedCount = db.find('reports', r => r.villageId === village.id && r.status === 'RESOLVED').length;

  res.json({
    success: true,
    data: {
      ...village,
      stats: { totalReports: reportCount, resolvedReports: resolvedCount },
      alerts
    }
  });
});

// 4. Get Schools List
app.get('/api/schools', (req, res) => {
  const schools = db.find('schools', s => s.isActive !== false);
  res.json({ success: true, data: schools });
});

// 5. Get School Detail
app.get('/api/schools/:id', (req, res) => {
  const school = db.findOne('schools', s => s.id === req.params.id);
  if (!school) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy trường học.' });
  }

  const alerts = db.find('alerts', a => a.isPublished && (a.schoolId === school.id || (!a.villageId && !a.schoolId)));
  const reportCount = db.find('reports', r => r.schoolId === school.id).length;

  res.json({
    success: true,
    data: {
      ...school,
      stats: { totalReports: reportCount },
      alerts
    }
  });
});

// 6. Get Scam Types
app.get('/api/scam-types', (req, res) => {
  const scamTypes = db.find('scamTypes', s => s.isActive !== false);
  res.json({ success: true, data: scamTypes });
});

// 7. Get Handbook Articles
app.get('/api/handbook', (req, res) => {
  const { category, search, featured } = req.query;
  let articles = db.find('handbookArticles', a => a.isPublished !== false);

  if (category) {
    articles = articles.filter(a => a.category === category);
  }
  if (featured === 'true') {
    articles = articles.filter(a => a.isFeatured);
  }
  if (search) {
    const q = search.toLowerCase();
    articles = articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.summary && a.summary.toLowerCase().includes(q)) ||
      (a.category && a.category.toLowerCase().includes(q))
    );
  }

  // Sort by order or createdAt
  articles.sort((a, b) => (a.order || 999) - (b.order || 999));
  res.json({ success: true, data: articles });
});

// 8. Get Handbook Article Detail
app.get('/api/handbook/:id', (req, res) => {
  const article = db.findOne('handbookArticles', a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết cẩm nang.' });
  }
  res.json({ success: true, data: article });
});

// 9. Get Public Alerts
app.get('/api/alerts', (req, res) => {
  const alerts = db.find('alerts', a => a.isPublished);
  // Sort pinned first, then newest
  alerts.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json({ success: true, data: alerts });
});

// 10. Submit Scam Report (Citizen)
app.post('/api/reports', upload.array('evidenceFiles', 5), (req, res) => {
  try {
    const {
      fullName,
      phone,
      villageId,
      schoolId,
      scamTypeId,
      incidentTime,
      amount,
      description,
      suspiciousContact,
      contactMethod,
      severity,
      confirmAccuracy
    } = req.body;

    if (!fullName || !phone || !description) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (Họ tên, Số điện thoại, Nội dung vụ việc).'
      });
    }

    if (!confirmAccuracy || confirmAccuracy === 'false') {
      return res.status(400).json({
        success: false,
        message: 'Bạn cần xác nhận thông tin cung cấp là đúng sự thật.'
      });
    }

    const reportCode = db.getNextReportCode();
    const id = 'rep-' + Date.now();

    const uploadedFiles = (req.files || []).map(f => ({
      originalName: f.originalname,
      filename: f.filename,
      path: '/uploads/' + f.filename,
      size: f.size,
      mimetype: f.mimetype
    }));

    const newReport = {
      id,
      reportCode,
      fullName: fullName.trim(),
      phone: phone.trim(),
      villageId: villageId || null,
      schoolId: schoolId || null,
      scamTypeId: scamTypeId || 'st-15',
      incidentTime: incidentTime || new Date().toISOString().slice(0, 16),
      amount: amount ? Number(amount.toString().replace(/[^0-9]/g, '')) : 0,
      description: description.trim(),
      suspiciousContact: suspiciousContact ? suspiciousContact.trim() : '',
      contactMethod: contactMethod || 'Khác',
      evidenceFiles: uploadedFiles,
      severity: severity || 'SUSPECTED', // SUSPECTED, SCAMMED, RISK, EMERGENCY
      status: 'NEW', // NEW, VERIFYING, IN_PROGRESS, RESOLVED, ARCHIVED
      assignedTo: null,
      adminNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.create('reports', newReport);

    // Initial audit log
    db.create('reportLogs', {
      id: 'rl-' + Date.now(),
      reportId: id,
      userId: 'SYSTEM',
      userName: 'Hệ thống tiếp nhận tự động',
      oldStatus: null,
      newStatus: 'NEW',
      note: 'Người dân gửi báo cáo trực tuyến thành công.',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Báo cáo của bạn đã được tiếp nhận thành công.',
      data: {
        reportCode: newReport.reportCode,
        createdAt: newReport.createdAt,
        status: newReport.status
      }
    });
  } catch (err) {
    console.error('Error submitting report:', err);
    res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra khi xử lý báo cáo. Vui lòng thử lại.' });
  }
});

// 11. Track Report Status by Code (Public Lookup - Strict Privacy)
app.get('/api/reports/track/:code', (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã báo cáo hợp lệ.' });
  }

  const report = db.findOne('reports', r => r.reportCode.toUpperCase() === code);
  if (!report) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy báo cáo có mã "${code}". Vui lòng kiểm tra lại chính xác mã báo cáo.`
    });
  }

  // Lookup village, school, scamType names
  const village = report.villageId ? db.findOne('villages', v => v.id === report.villageId) : null;
  const school = report.schoolId ? db.findOne('schools', s => s.id === report.schoolId) : null;
  const scamType = report.scamTypeId ? db.findOne('scamTypes', st => st.id === report.scamTypeId) : null;

  // Retrieve public-safe timeline logs
  const logs = db.find('reportLogs', l => l.reportId === report.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(l => ({
      status: l.newStatus,
      createdAt: l.createdAt,
      note: l.note
    }));

  // Safe Public Response (NO phone, NO full name, NO sensitive internal investigation steps)
  const publicSafeData = {
    reportCode: report.reportCode,
    maskedName: maskName(report.fullName),
    villageName: village ? village.name : (school ? school.name : 'Địa bàn xã Trà Liên'),
    scamTypeName: scamType ? scamType.name : 'Vụ việc nghi ngờ',
    incidentTime: report.incidentTime,
    severity: report.severity,
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    policeNotice: report.status === 'RESOLVED'
      ? 'Vụ việc đã được Công an xã Trà Liên xác minh, xử lý hoàn tất hoặc đã đưa vào diện theo dõi an ninh.'
      : report.status === 'IN_PROGRESS'
      ? 'Công an xã đang chủ trì phối hợp xác minh và áp dụng các biện pháp nghiệp vụ ngăn chặn.'
      : report.status === 'VERIFYING'
      ? 'Hồ sơ đang được cán bộ chuyên trách liên hệ xác minh thông tin minh chứng.'
      : 'Hồ sơ đã được tiếp nhận vào hệ thống và đang chờ phân công cán bộ thụ lý.',
    timeline: logs
  };

  res.json({ success: true, data: publicSafeData });
});

// 12. Public Statistics Aggregate
app.get('/api/public-stats', (req, res) => {
  const reports = db.find('reports') || [];
  const villages = db.find('villages', v => v.isActive) || [];
  const scamTypes = db.find('scamTypes') || [];

  const total = reports.length;
  const resolved = reports.filter(r => r.status === 'RESOLVED').length;
  const inProgress = reports.filter(r => ['VERIFYING', 'IN_PROGRESS'].includes(r.status)).length;
  const newReports = reports.filter(r => r.status === 'NEW').length;

  // Top scam types
  const typeMap = {};
  for (const r of reports) {
    typeMap[r.scamTypeId] = (typeMap[r.scamTypeId] || 0) + 1;
  }
  const topScams = Object.entries(typeMap).map(([id, count]) => {
    const st = scamTypes.find(x => x.id === id);
    return { id, name: st ? st.name : 'Khác', count };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  // Village breakdown
  const villageStats = villages.map(v => {
    const count = reports.filter(r => r.villageId === v.id).length;
    return { id: v.id, name: v.name, count };
  });

  res.json({
    success: true,
    data: {
      total,
      resolved,
      inProgress,
      newReports,
      resolvedRate: total > 0 ? Math.round((resolved / total) * 100) : 100,
      topScams,
      villageStats
    }
  });
});

// ==========================================
// ADMIN / OFFICER AUTHENTICATION
// ==========================================

// Admin Login
const handleLogin = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
  }

  const user = db.findOne('users', u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }

  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Đăng nhập thành công.',
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      badgeNumber: user.badgeNumber
    }
  });
};

app.post('/api/admin/login', handleLogin);
app.post('/api/auth/login', handleLogin);

// Get Current User Info
const handleGetMe = (req, res) => {
  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản.' });
  }
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      badgeNumber: user.badgeNumber
    }
  });
};

app.get('/api/admin/me', requireAuth, handleGetMe);
app.get('/api/auth/me', requireAuth, handleGetMe);

// Change Password
app.post('/api/admin/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
  }

  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
  }

  const isMatch = bcrypt.compareSync(oldPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);
  db.update('users', user.id, { passwordHash });

  res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
});

// ==========================================
// ADMIN DASHBOARD & ANALYTICS
// ==========================================

const handleAdminDashboard = (req, res) => {
  const { period = '30d' } = req.query; // today, 7d, 30d, 3m, 6m, 1y, all
  const reports = db.find('reports') || [];
  const villages = db.find('villages') || [];
  const schools = db.find('schools') || [];
  const scamTypes = db.find('scamTypes') || [];
  const articles = db.find('handbookArticles') || [];

  // Filter reports by period
  const now = new Date();
  let filterDate = new Date(0);
  if (period === 'today') {
    filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === '7d') {
    filterDate = new Date(now.getTime() - 7 * 86400000);
  } else if (period === '30d') {
    filterDate = new Date(now.getTime() - 30 * 86400000);
  } else if (period === '3m') {
    filterDate = new Date(now.getTime() - 90 * 86400000);
  } else if (period === '6m') {
    filterDate = new Date(now.getTime() - 180 * 86400000);
  } else if (period === '1y') {
    filterDate = new Date(now.getTime() - 365 * 86400000);
  }

  const filteredReports = period === 'all'
    ? reports
    : reports.filter(r => new Date(r.createdAt) >= filterDate);

  // Stats calculation
  const total = filteredReports.length;
  const newCount = filteredReports.filter(r => r.status === 'NEW').length;
  const verifyingCount = filteredReports.filter(r => r.status === 'VERIFYING').length;
  const processingCount = filteredReports.filter(r => r.status === 'IN_PROGRESS').length;
  const resolvedCount = filteredReports.filter(r => r.status === 'RESOLVED').length;
  const archivedCount = filteredReports.filter(r => r.status === 'ARCHIVED').length;

  // Breakdown by Village
  const villageReports = villages.map(v => ({
    id: v.id,
    name: v.name,
    count: filteredReports.filter(r => r.villageId === v.id).length
  }));

  // Breakdown by School
  const schoolReports = schools.map(s => ({
    id: s.id,
    name: s.name,
    count: filteredReports.filter(r => r.schoolId === s.id).length
  }));

  // Breakdown by Scam Type
  const scamTypeReports = scamTypes.map(st => ({
    id: st.id,
    name: st.name,
    count: filteredReports.filter(r => r.scamTypeId === st.id).length
  })).sort((a, b) => b.count - a.count);

  // Breakdown by Status
  const statusReports = [
    { label: 'Mới tiếp nhận', status: 'NEW', count: newCount, color: '#eab308' },
    { label: 'Đang xác minh', status: 'VERIFYING', count: verifyingCount, color: '#3b82f6' },
    { label: 'Đang xử lý', status: 'IN_PROGRESS', count: processingCount, color: '#f97316' },
    { label: 'Đã xử lý', status: 'RESOLVED', count: resolvedCount, color: '#22c55e' },
    { label: 'Đã lưu trữ', status: 'ARCHIVED', count: archivedCount, color: '#94a3b8' }
  ];

  // Timeline breakdown (by month or by day depending on period)
  const timelineMap = {};
  filteredReports.forEach(r => {
    const d = new Date(r.createdAt);
    const key = period === 'today' || period === '7d' || period === '30d'
      ? `${d.getDate()}/${d.getMonth() + 1}`
      : `T${d.getMonth() + 1}/${d.getFullYear()}`;
    timelineMap[key] = (timelineMap[key] || 0) + 1;
  });

  const timelineLabels = Object.keys(timelineMap);
  const timelineData = Object.values(timelineMap);

  res.json({
    success: true,
    data: {
      stats: {
        totalReports: total,
        newReports: newCount,
        verifyingReports: verifyingCount,
        processingReports: processingCount,
        resolvedReports: resolvedCount,
        archivedReports: archivedCount,
        totalArticles: articles.length,
        totalVillages: villages.length,
        totalSchools: schools.length
      },
      charts: {
        villages: villageReports,
        schools: schoolReports,
        scamTypes: scamTypeReports,
        status: statusReports,
        timeline: { labels: timelineLabels, data: timelineData }
      }
    }
  });
};

app.get('/api/admin/dashboard', requireAuth, handleAdminDashboard);
app.get('/api/admin/stats', requireAuth, handleAdminDashboard);

// ==========================================
// ADMIN REPORT MANAGEMENT
// ==========================================

// 1. Get Reports (with rich filtering)
app.get('/api/admin/reports', requireAuth, (req, res) => {
  const {
    status,
    villageId,
    schoolId,
    scamTypeId,
    severity,
    assignedTo,
    search,
    startDate,
    endDate
  } = req.query;

  let reports = db.find('reports') || [];

  if (status) reports = reports.filter(r => r.status === status);
  if (villageId) reports = reports.filter(r => r.villageId === villageId);
  if (schoolId) reports = reports.filter(r => r.schoolId === schoolId);
  if (scamTypeId) reports = reports.filter(r => r.scamTypeId === scamTypeId);
  if (severity) reports = reports.filter(r => r.severity === severity);
  if (assignedTo) reports = reports.filter(r => r.assignedTo === assignedTo);

  if (startDate) {
    const s = new Date(startDate);
    reports = reports.filter(r => new Date(r.createdAt) >= s);
  }
  if (endDate) {
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    reports = reports.filter(r => new Date(r.createdAt) <= e);
  }

  if (search) {
    const q = search.toLowerCase();
    reports = reports.filter(r =>
      r.reportCode.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  }

  // Enrich with names
  const villages = db.find('villages');
  const schools = db.find('schools');
  const scamTypes = db.find('scamTypes');
  const users = db.find('users');

  const enriched = reports.map(r => {
    const v = villages.find(x => x.id === r.villageId);
    const s = schools.find(x => x.id === r.schoolId);
    const st = scamTypes.find(x => x.id === r.scamTypeId);
    const u = users.find(x => x.id === r.assignedTo);
    return {
      ...r,
      locationName: v ? v.name : (s ? s.name : 'Địa bàn chung'),
      scamTypeName: st ? st.name : 'Khác',
      assignedOfficerName: u ? u.fullName : 'Chưa phân công'
    };
  });

  // Sort by createdAt descending
  enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, data: enriched });
});

// 2. Get Single Report Detail (with logs)
app.get('/api/admin/reports/:id', requireAuth, (req, res) => {
  const report = db.findOne('reports', r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ báo cáo.' });
  }

  const village = report.villageId ? db.findOne('villages', v => v.id === report.villageId) : null;
  const school = report.schoolId ? db.findOne('schools', s => s.id === report.schoolId) : null;
  const scamType = report.scamTypeId ? db.findOne('scamTypes', st => st.id === report.scamTypeId) : null;
  const officer = report.assignedTo ? db.findOne('users', u => u.id === report.assignedTo) : null;

  const logs = db.find('reportLogs', l => l.reportId === report.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    data: {
      ...report,
      locationName: village ? village.name : (school ? school.name : 'Địa bàn chung'),
      scamTypeName: scamType ? scamType.name : 'Khác',
      assignedOfficerName: officer ? officer.fullName : 'Chưa phân công',
      logs
    }
  });
});

// 3. Update Report Status, Assignment & Processing Note
app.patch('/api/admin/reports/:id/status', requireAuth, (req, res) => {
  const { status, assignedTo, adminNote, logNote } = req.body;
  const report = db.findOne('reports', r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Báo cáo không tồn tại.' });
  }

  const oldStatus = report.status;
  const updates = {};
  if (status) updates.status = status;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  if (adminNote !== undefined) updates.adminNote = adminNote;

  const updatedReport = db.update('reports', report.id, updates);

  // Add Log Entry
  const currentUser = db.findOne('users', u => u.id === req.user.id);
  const logEntry = {
    id: 'rl-' + Date.now(),
    reportId: report.id,
    userId: req.user.id,
    userName: currentUser ? currentUser.fullName : req.user.username,
    oldStatus,
    newStatus: status || oldStatus,
    note: logNote || adminNote || `Cập nhật trạng thái từ ${oldStatus} sang ${status || oldStatus}`,
    createdAt: new Date().toISOString()
  };
  db.create('reportLogs', logEntry);

  res.json({
    success: true,
    message: 'Cập nhật tiến độ xử lý báo cáo thành công.',
    data: updatedReport
  });
});

// 4. Delete Report (Admin only)
app.delete('/api/admin/reports/:id', requireAdmin, (req, res) => {
  const report = db.findOne('reports', r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });
  }

  db.delete('reports', report.id);
  // Also clean logs
  const logs = db.find('reportLogs', l => l.reportId === report.id);
  logs.forEach(l => db.delete('reportLogs', l.id));

  res.json({ success: true, message: 'Đã xóa báo cáo thành công.' });
});

// 5. Export Reports to CSV
app.get('/api/admin/reports/export/csv', requireAuth, (req, res) => {
  const reports = db.find('reports') || [];
  const villages = db.find('villages');
  const schools = db.find('schools');
  const scamTypes = db.find('scamTypes');
  const users = db.find('users');

  const headers = [
    'Mã Báo Cáo',
    'Thời Gian Gửi',
    'Họ Và Tên',
    'Số Điện Thoại',
    'Địa Bàn',
    'Loại Lừa Đảo',
    'Thời Gian Xảy Ra',
    'Số Tiền Thiệt Hại (VNĐ)',
    'Hình Thức Tiếp Cận',
    'Đầu Mối Nghi Ngờ',
    'Mức Độ',
    'Trạng Thái',
    'Cán Bộ Xử Lý',
    'Ghi Chú Xử Lý'
  ];

  const rows = reports.map(r => {
    const v = villages.find(x => x.id === r.villageId);
    const s = schools.find(x => x.id === r.schoolId);
    const st = scamTypes.find(x => x.id === r.scamTypeId);
    const u = users.find(x => x.id === r.assignedTo);

    return [
      `"${r.reportCode}"`,
      `"${new Date(r.createdAt).toLocaleString('vi-VN')}"`,
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${r.phone}"`,
      `"${(v ? v.name : (s ? s.name : 'Địa bàn chung')).replace(/"/g, '""')}"`,
      `"${(st ? st.name : 'Khác').replace(/"/g, '""')}"`,
      `"${r.incidentTime || ''}"`,
      `"${r.amount || 0}"`,
      `"${r.contactMethod || ''}"`,
      `"${(r.suspiciousContact || '').replace(/"/g, '""')}"`,
      `"${r.severity}"`,
      `"${r.status}"`,
      `"${(u ? u.fullName : 'Chưa phân công').replace(/"/g, '""')}"`,
      `"${(r.adminNote || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=Bao_cao_lua_dao_Tra_Lien_${new Date().toISOString().slice(0, 10)}.csv`);
  res.send(csvContent);
});

// ==========================================
// ADMIN HANDBOOK MANAGEMENT (CRUD)
// ==========================================

app.post('/api/admin/handbook', requireAdmin, (req, res) => {
  const {
    title,
    category,
    scamTypeId,
    imageUrl,
    videoUrl,
    summary,
    signs,
    examples,
    prevention,
    actions,
    isFeatured,
    isPublished,
    order
  } = req.body;

  if (!title || !category) {
    return res.status(400).json({ success: false, message: 'Tiêu đề và danh mục là bắt buộc.' });
  }

  const newArticle = {
    id: 'hb-' + Date.now(),
    title: title.trim(),
    category: category.trim(),
    scamTypeId: scamTypeId || null,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    videoUrl: videoUrl || '',
    summary: summary || '',
    signs: Array.isArray(signs) ? signs : (signs ? signs.split('\n').filter(Boolean) : []),
    examples: examples || '',
    prevention: Array.isArray(prevention) ? prevention : (prevention ? prevention.split('\n').filter(Boolean) : []),
    actions: actions || '',
    isFeatured: Boolean(isFeatured),
    isPublished: isPublished !== false,
    order: Number(order) || 99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.create('handbookArticles', newArticle);
  res.status(201).json({ success: true, message: 'Đã thêm bài viết cẩm nang thành công.', data: newArticle });
});

app.put('/api/admin/handbook/:id', requireAdmin, (req, res) => {
  const article = db.findOne('handbookArticles', a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
  }

  const updates = { ...req.body };
  if (typeof updates.signs === 'string') {
    updates.signs = updates.signs.split('\n').filter(Boolean);
  }
  if (typeof updates.prevention === 'string') {
    updates.prevention = updates.prevention.split('\n').filter(Boolean);
  }

  const updated = db.update('handbookArticles', article.id, updates);
  res.json({ success: true, message: 'Cập nhật bài viết cẩm nang thành công.', data: updated });
});

app.delete('/api/admin/handbook/:id', requireAdmin, (req, res) => {
  const success = db.delete('handbookArticles', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
  }
  res.json({ success: true, message: 'Đã xóa bài viết cẩm nang.' });
});

// ==========================================
// ADMIN VILLAGES MANAGEMENT (CRUD)
// ==========================================

app.post('/api/admin/villages', requireAdmin, (req, res) => {
  const { name, code, description, population, households, headOfficer, contactPhone, imageUrl, propagandaContent, isActive, order } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Tên thôn là bắt buộc.' });
  }

  const newVillage = {
    id: 'v-' + Date.now(),
    name: name.trim(),
    code: code || '',
    description: description || '',
    population: Number(population) || 0,
    households: Number(households) || 0,
    headOfficer: headOfficer || '',
    contactPhone: contactPhone || '',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80',
    propagandaContent: propagandaContent || '',
    isActive: isActive !== false,
    order: Number(order) || 99
  };

  db.create('villages', newVillage);
  res.status(201).json({ success: true, message: 'Đã thêm thôn mới thành công.', data: newVillage });
});

app.put('/api/admin/villages/:id', requireAdmin, (req, res) => {
  const updated = db.update('villages', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thôn.' });
  }
  res.json({ success: true, message: 'Cập nhật thông tin thôn thành công.', data: updated });
});

app.delete('/api/admin/villages/:id', requireAdmin, (req, res) => {
  const success = db.delete('villages', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thôn.' });
  }
  res.json({ success: true, message: 'Đã xóa thôn thành công.' });
});

// ==========================================
// ADMIN SCHOOLS MANAGEMENT (CRUD)
// ==========================================

app.post('/api/admin/schools', requireAdmin, (req, res) => {
  const { name, code, level, description, contactInfo, imageUrl, studentWarning, parentGuide, isActive, order } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Tên trường học là bắt buộc.' });
  }

  const newSchool = {
    id: 's-' + Date.now(),
    name: name.trim(),
    code: code || '',
    level: level || 'Tiểu học',
    description: description || '',
    contactInfo: contactInfo || '',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80',
    studentWarning: studentWarning || '',
    parentGuide: parentGuide || '',
    isActive: isActive !== false,
    order: Number(order) || 99
  };

  db.create('schools', newSchool);
  res.status(201).json({ success: true, message: 'Đã thêm trường học mới thành công.', data: newSchool });
});

app.put('/api/admin/schools/:id', requireAdmin, (req, res) => {
  const updated = db.update('schools', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy trường học.' });
  }
  res.json({ success: true, message: 'Cập nhật trường học thành công.', data: updated });
});

app.delete('/api/admin/schools/:id', requireAdmin, (req, res) => {
  const success = db.delete('schools', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy trường học.' });
  }
  res.json({ success: true, message: 'Đã xóa trường học thành công.' });
});

// ==========================================
// ADMIN SCAM TYPES MANAGEMENT (CRUD)
// ==========================================

app.post('/api/admin/scam-types', requireAdmin, (req, res) => {
  const { name, icon, isActive } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Tên loại lừa đảo là bắt buộc.' });
  }

  const newType = {
    id: 'st-' + Date.now(),
    name: name.trim(),
    icon: icon || 'shield-alert',
    isActive: isActive !== false
  };

  db.create('scamTypes', newType);
  res.status(201).json({ success: true, message: 'Đã thêm loại lừa đảo mới.', data: newType });
});

app.put('/api/admin/scam-types/:id', requireAdmin, (req, res) => {
  const updated = db.update('scamTypes', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy loại lừa đảo.' });
  }
  res.json({ success: true, message: 'Cập nhật loại lừa đảo thành công.', data: updated });
});

app.delete('/api/admin/scam-types/:id', requireAdmin, (req, res) => {
  const success = db.delete('scamTypes', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy loại lừa đảo.' });
  }
  res.json({ success: true, message: 'Đã xóa loại lừa đảo.' });
});

// ==========================================
// ADMIN ALERTS MANAGEMENT (CRUD)
// ==========================================

app.post('/api/admin/alerts', requireAdmin, (req, res) => {
  const { title, content, imageUrl, severity, villageId, schoolId, targetAudience, isPublished, isPinned, startDate, endDate } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung cảnh báo là bắt buộc.' });
  }

  const newAlert = {
    id: 'alt-' + Date.now(),
    title: title.trim(),
    content: content.trim(),
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    severity: severity || 'HIGH', // EMERGENCY, HIGH, MEDIUM, INFO
    villageId: villageId || null,
    schoolId: schoolId || null,
    targetAudience: targetAudience || 'Toàn thể nhân dân',
    isPublished: isPublished !== false,
    isPinned: Boolean(isPinned),
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString()
  };

  db.create('alerts', newAlert);
  res.status(201).json({ success: true, message: 'Đã đăng cảnh báo mới thành công.', data: newAlert });
});

app.put('/api/admin/alerts/:id', requireAdmin, (req, res) => {
  const updated = db.update('alerts', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy cảnh báo.' });
  }
  res.json({ success: true, message: 'Cập nhật cảnh báo thành công.', data: updated });
});

app.delete('/api/admin/alerts/:id', requireAdmin, (req, res) => {
  const success = db.delete('alerts', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy cảnh báo.' });
  }
  res.json({ success: true, message: 'Đã xóa cảnh báo.' });
});

// ==========================================
// ADMIN USER MANAGEMENT (Admin only)
// ==========================================

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.find('users').map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    phone: u.phone,
    badgeNumber: u.badgeNumber,
    isActive: u.isActive,
    createdAt: u.createdAt
  }));
  res.json({ success: true, data: users });
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, password, fullName, role, phone, badgeNumber } = req.body;
  if (!username || !password || !fullName) {
    return res.status(400).json({ success: false, message: 'Tên đăng nhập, mật khẩu và họ tên là bắt buộc.' });
  }

  const existing = db.findOne('users', u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại trong hệ thống.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newUser = {
    id: 'u-' + Date.now(),
    username: username.trim().toLowerCase(),
    passwordHash: bcrypt.hashSync(password, salt),
    fullName: fullName.trim(),
    role: role === 'ADMIN' ? 'ADMIN' : 'OFFICER',
    phone: phone || '',
    badgeNumber: badgeNumber || '',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  db.create('users', newUser);
  res.status(201).json({
    success: true,
    message: 'Tạo tài khoản cán bộ thành công.',
    data: {
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role
    }
  });
});

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const user = db.findOne('users', u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
  }

  const updates = { ...req.body };
  if (updates.password) {
    const salt = bcrypt.genSaltSync(10);
    updates.passwordHash = bcrypt.hashSync(updates.password, salt);
    delete updates.password;
  }

  const updated = db.update('users', user.id, updates);
  res.json({ success: true, message: 'Cập nhật tài khoản cán bộ thành công.' });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ success: false, message: 'Không thể tự xóa tài khoản của chính mình.' });
  }
  const success = db.delete('users', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
  }
  res.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
});

// ==========================================
// SYSTEM SETTINGS & AUDIT LOGS
// ==========================================

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, message: 'Đã lưu cấu hình hệ thống thành công.', data: updated });
});

app.get('/api/admin/logs', requireAuth, (req, res) => {
  const logs = db.find('reportLogs') || [];
  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: logs });
});

// Standalone File Upload Handler
app.post('/api/admin/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Không có tệp nào được tải lên.' });
  }
  res.json({
    success: true,
    fileUrl: '/uploads/' + req.file.filename,
    filename: req.file.filename
  });
});

// Admin SPA fallback
app.get(/^\/admin/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Public SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` CÔNG AN XÃ TRÀ LIÊN - HỆ THỐNG BÁO CÁO & PHÒNG CHỐNG LỪA ĐẢO`);
  console.log(` Máy chủ đang chạy tại: http://localhost:${PORT}`);
  console.log(` Trang người dân:      http://localhost:${PORT}`);
  console.log(` Trang quản trị:       http://localhost:${PORT}/admin`);
  console.log(` Tài khoản Admin:      admin / congantralien@2026`);
  console.log(` Tài khoản Cán bộ:     canbo1 / canbo123@`);
  console.log(`=======================================================`);
});
