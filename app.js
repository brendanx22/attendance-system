  require('dotenv').config();
  const express = require('express');
  const session = require('express-session');
  const MySQLStore = require('express-mysql-session')(session);
  const path = require('path');
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  const cors = require('cors');
  const morgan = require('morgan');
  const fs = require('fs');
  const db = require('./Config/db');

  // Route imports
  const authRoutes = require('./Routes/authRoutes');
  const teacherRoutes = require('./Routes/teacherRoutes');
  const studentRoutes = require('./Routes/studentRoutes');

  const app = express();

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-eval'", // Only if needed for specific libraries
            "https://cdn.jsdelivr.net"
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Bootstrap/FontAwesome
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com"
          ],
          fontSrc: [
            "'self'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com"
          ],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  });
  if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}


  // Logging
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));


  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Update CORS configuration
  app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      exposedHeaders: ['set-cookie']
  }));

  // Update session cookie settings
  const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));


  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    sessionConfig.cookie.secure = true;
  }

  app.use(session(sessionConfig));

  (async () => {
    try {
      const connection = await db.getConnection();
      console.log('✅ MySQL connected successfully');
      connection.release();
    } catch (err) {
      console.error('❌ MySQL connection failed:', err);
      process.exit(1);
    }
  })();

  app.get('/', (req, res) => {
    // Check if user is logged in
    if (req.session.user) {
      return res.redirect(req.session.user.role === 'teacher' 
        ? '/teacher/dashboard' 
        : '/student/dashboard');
    }
    // Serve login page for unauthenticated users
    res.sendFile(path.join(publicPath, 'views', 'index.html'));
  });

  // Database connection check
  db.getConnection((err, connection) => {
    if (err) {
      console.error('❌ MySQL connection failed:', err);
      process.exit(1);
    }
    console.log('✅ MySQL connected successfully');
    connection.release(); // Release the connection back to the pool
  });

  // Static files - Serve from Public directory
  const publicPath = path.join(__dirname, 'Public');
  app.use(express.static(publicPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
    index: 'index.html' // This ensures / serves index.html
  }));

  // Verify Public directory exists
  if (!fs.existsSync(publicPath)) {
    console.error('ERROR: Public directory not found at:', publicPath);
    process.exit(1);
  }

  // Routes
  app.use('/auth', authRoutes);
  app.use('/teacher', teacherRoutes);
  app.use('/student', studentRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'UP',
      database: db.state === 'connected' ? 'CONNECTED' : 'DISCONNECTED'
    });
  });

  // Test route for debugging paths
  app.get('/test-paths', (req, res) => {
    res.json({
      __dirname: __dirname,
      publicPath: publicPath,
      viewsPath: path.join(publicPath, 'views'),
      files: {
        dashboard: fs.existsSync(path.join(publicPath, 'views', 'teacher-dashboard.html')),
        classes: fs.existsSync(path.join(publicPath, 'views', 'classes.html')),
        attendance: fs.existsSync(path.join(publicPath, 'views', 'attendance.html'))
      }
    });
  });

  app.get('/debug/session', (req, res) => {
      res.json({
          session: req.session,
          cookies: req.headers.cookie,
          headers: req.headers
      });
  });

  // Add session endpoint
  app.get('/session', (req, res) => {
      if (!req.session.user) {
          return res.status(401).json({ error: 'No active session' });
      }
      res.json({ 
          user: req.session.user,
          success: true 
      });
  });

  // 404 Handler
  app.use((req, res, next) => {
    res.status(404).json({ 
      error: 'Not Found',
      message: `The requested resource ${req.path} was not found`
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
      error: 'Something went wrong!',
      message: process.env.NODE_ENV !== 'production' ? err.message : undefined,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  });

  // Server configuration
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || 'localhost';

  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log('📁 Public directory:', publicPath);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });

  app.use((req, res, next) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      next();
  });

  
  module.exports = app;