const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const BackupManager = require('./backup');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-supermarket-pos-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Database setup (supports env override)
const configuredDbPath = process.env.DB_PATH || path.join('db', 'pos.db');
const dbPath = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.join(__dirname, configuredDbPath);
const dbDir = path.dirname(dbPath);

// Ensure db directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database error:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
    initializeBackup();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Transactions table
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_id INTEGER NOT NULL,
      total REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      payment_method TEXT NOT NULL,
      customer_email TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cashier_id) REFERENCES users (id)
    )`);

    // Transaction items table
    db.run(`CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    // Customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default admin user if not exists
    db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
      if (!row) {
        const hashedPassword = bcrypt.hashSync('admin', 10);
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
          ['admin', hashedPassword, 'admin']);
        console.log('Default admin user created (username: admin, password: admin)');
      }
    });

    // Insert default cashier user if not exists
    db.get("SELECT id FROM users WHERE username = 'cashier'", (err, row) => {
      if (!row) {
        const hashedPassword = bcrypt.hashSync('cashier', 10);
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
          ['cashier', hashedPassword, 'cashier']);
        console.log('Default cashier user created (username: cashier, password: cashier)');
      }
    });

    // Insert default settings
    const defaultSettings = [
      ['backup_enabled', 'false'],
      ['printer_enabled', 'false'],
      ['company_name', 'Supermarket POS'],
      ['company_address', '123 Main St, City, State']
    ];

    defaultSettings.forEach(([key, value]) => {
      db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });

    console.log('Database initialized successfully');
  });
}

// Backup initialization
let backupManager = null;
async function initializeBackup() {
  try {
    backupManager = new BackupManager();
    await backupManager.initialize();
  } catch (error) {
    console.log('Backup system disabled due to configuration error:', error.message);
    backupManager = null;
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// API Routes

// Authentication
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication error' });
      }
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    });
  });
});

// Token refresh endpoint
app.post('/api/refresh-token', authenticateToken, (req, res) => {
  // Generate new token with extended expiration
  const token = jwt.sign(
    { id: req.user.id, username: req.user.username, role: req.user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// Products API
app.get('/api/products', authenticateToken, (req, res) => {
  const { search, category, page = 1, limit = 50 } = req.query;
  let query = 'SELECT * FROM products';
  let params = [];

  if (search) {
    query += ' WHERE name LIKE ? OR barcode LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  } else if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }

  query += ' ORDER BY name LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
  const { name, barcode, price, stock, category, description } = req.body;

  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Name, price, and stock are required' });
  }

  const numericPrice = Number(price);
  const numericStock = Number(stock);
  if (Number.isNaN(numericPrice) || Number.isNaN(numericStock) || numericPrice < 0 || numericStock < 0) {
    return res.status(400).json({ error: 'Price and stock must be non-negative numbers' });
  }

  const barcodeValue = barcode && String(barcode).trim() !== '' ? String(barcode).trim() : null;
  const productName = String(name).trim();

  // Check for duplicate product name (case-insensitive)
  db.get(
    `SELECT id, name, barcode FROM products WHERE LOWER(name) = LOWER(?)`,
    [productName],
    (err, existingProduct) => {
      if (err) {
        return res.status(500).json({ error: 'Database error while checking for duplicates' });
      }

      if (existingProduct) {
        let errorMessage = `Product with name "${existingProduct.name}" already exists`;
        if (existingProduct.barcode) {
          errorMessage += ` (Barcode: ${existingProduct.barcode})`;
        }
        return res.status(409).json({ 
          error: errorMessage,
          duplicateType: 'name',
          existingProduct: {
            id: existingProduct.id,
            name: existingProduct.name,
            barcode: existingProduct.barcode
          }
        });
      }

      // If barcode is provided, check for duplicate barcode
      if (barcodeValue) {
        db.get(
          `SELECT id, name, barcode FROM products WHERE barcode = ?`,
          [barcodeValue],
          (err, existingBarcode) => {
            if (err) {
              return res.status(500).json({ error: 'Database error while checking barcode' });
            }

            if (existingBarcode) {
              return res.status(409).json({ 
                error: `Barcode "${barcodeValue}" is already assigned to product "${existingBarcode.name}"`,
                duplicateType: 'barcode',
                existingProduct: {
                  id: existingBarcode.id,
                  name: existingBarcode.name,
                  barcode: existingBarcode.barcode
                }
              });
            }

            // No duplicates found, proceed with insertion
            insertProduct();
          }
        );
      } else {
        // No barcode provided, proceed with insertion
        insertProduct();
      }

      function insertProduct() {
        db.run(
          `INSERT INTO products (name, barcode, price, stock, category, description) VALUES (?, ?, ?, ?, ?, ?)`,
          [productName, barcodeValue, numericPrice, numericStock, category, description],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, message: 'Product created successfully' });
          }
        );
      }
    }
  );
});

app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, barcode, price, stock, category, description } = req.body;

  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Name, price, and stock are required' });
  }

  const numericPrice = Number(price);
  const numericStock = Number(stock);
  if (Number.isNaN(numericPrice) || Number.isNaN(numericStock) || numericPrice < 0 || numericStock < 0) {
    return res.status(400).json({ error: 'Price and stock must be non-negative numbers' });
  }

  const barcodeValue = barcode && String(barcode).trim() !== '' ? String(barcode).trim() : null;
  const productName = String(name).trim();

  // Check for duplicate product name (case-insensitive), excluding current product
  db.get(
    `SELECT id, name, barcode FROM products WHERE LOWER(name) = LOWER(?) AND id != ?`,
    [productName, id],
    (err, existingProduct) => {
      if (err) {
        return res.status(500).json({ error: 'Database error while checking for duplicates' });
      }

      if (existingProduct) {
        let errorMessage = `Product with name "${existingProduct.name}" already exists`;
        if (existingProduct.barcode) {
          errorMessage += ` (Barcode: ${existingProduct.barcode})`;
        }
        return res.status(409).json({ 
          error: errorMessage,
          duplicateType: 'name',
          existingProduct: {
            id: existingProduct.id,
            name: existingProduct.name,
            barcode: existingProduct.barcode
          }
        });
      }

      // If barcode is provided, check for duplicate barcode, excluding current product
      if (barcodeValue) {
        db.get(
          `SELECT id, name, barcode FROM products WHERE barcode = ? AND id != ?`,
          [barcodeValue, id],
          (err, existingBarcode) => {
            if (err) {
              return res.status(500).json({ error: 'Database error while checking barcode' });
            }

            if (existingBarcode) {
              return res.status(409).json({ 
                error: `Barcode "${barcodeValue}" is already assigned to product "${existingBarcode.name}"`,
                duplicateType: 'barcode',
                existingProduct: {
                  id: existingBarcode.id,
                  name: existingBarcode.name,
                  barcode: existingBarcode.barcode
                }
              });
            }

            // No duplicates found, proceed with update
            updateProduct();
          }
        );
      } else {
        // No barcode provided, proceed with update
        updateProduct();
      }

      function updateProduct() {
        db.run(
          `UPDATE products SET name = ?, barcode = ?, price = ?, stock = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [productName, barcodeValue, numericPrice, numericStock, category, description, id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Product not found' });
            }
            res.json({ message: 'Product updated successfully' });
          }
        );
      }
    }
  );
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  });
});

// Transactions API
app.post('/api/transactions', authenticateToken, (req, res) => {
  const { items, payment_method, customer_email, discount_amount = 0 } = req.body;
  const cashier_id = req.user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  if (!payment_method) {
    return res.status(400).json({ error: 'Payment method is required' });
  }

  const total = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const final_total = total - discount_amount;

  // Pre-check stock availability
  let checked = 0;
  let insufficient = null;
  items.forEach((item) => {
    db.get(`SELECT stock, name FROM products WHERE id = ?`, [item.product_id], (err, row) => {
      checked++;
      if (!insufficient) {
        if (err) {
          insufficient = { message: 'Database error while checking stock' };
        } else if (!row) {
          insufficient = { message: `Product not found (ID ${item.product_id})` };
        } else if (row.stock < item.quantity) {
          insufficient = { message: `Insufficient stock for ${row.name}. Available: ${row.stock}` };
        }
      }

      if (checked === items.length) {
        if (insufficient) {
          return res.status(400).json({ error: insufficient.message });
        }

        // Begin atomic transaction
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) return res.status(500).json({ error: 'Failed to begin transaction' });

                      db.run(
              `INSERT INTO transactions (cashier_id, total, discount_amount, payment_method, customer_email) VALUES (?, ?, ?, ?, ?)`,
              [cashier_id, final_total, discount_amount, payment_method, customer_email],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }

              const transaction_id = this.lastID;
              let processed = 0;
              let failed = false;

              items.forEach((it) => {
                // Decrement stock only if enough remains
                db.run(
                  `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
                  [it.quantity, it.product_id, it.quantity],
                  function (err) {
                    if (failed) return; // already failing
                    if (err || this.changes === 0) {
                      failed = true;
                      db.run('ROLLBACK');
                      return res.status(400).json({ error: `Insufficient stock for product ID ${it.product_id}` });
                    }

                    // Insert item row
                    db.run(
                      `INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)`,
                      [transaction_id, it.product_id, it.quantity, it.unit_price, it.unit_price * it.quantity],
                      function (err) {
                        if (failed) return;
                        if (err) {
                          failed = true;
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: 'Failed to create transaction items' });
                        }

                        processed++;
                        if (processed === items.length && !failed) {
                          // Optional: update points
                          if (customer_email) {
                            const points = Math.floor(final_total / 10);
                            db.run(
                              `INSERT OR REPLACE INTO customers (email, points) VALUES (?, COALESCE((SELECT points FROM customers WHERE email = ?), 0) + ?)`,
                              [customer_email, customer_email, points]
                            );
                          }

                          db.run('COMMIT', (err) => {
                            if (err) {
                              db.run('ROLLBACK');
                              return res.status(500).json({ error: 'Failed to commit transaction' });
                            }
                            res.status(201).json({
                              transaction_id,
                              total: final_total,
                              message: 'Transaction completed successfully'
                            });
                          });
                        }
                      }
                    );
                  }
                );
              });
            }
          );
        });
      }
    });
  });
});

app.get('/api/transactions', authenticateToken, (req, res) => {
  const { page = 1, limit = 50, start_date, end_date } = req.query;
  let query = `
    SELECT t.*, u.username as cashier_name 
    FROM transactions t 
    JOIN users u ON t.cashier_id = u.id
  `;
  let params = [];

  if (start_date && end_date) {
    query += ' WHERE DATE(t.created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/transactions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(`
    SELECT t.*, u.username as cashier_name 
    FROM transactions t 
    JOIN users u ON t.cashier_id = u.id 
    WHERE t.id = ?
  `, [id], (err, transaction) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get transaction items
    db.all(`
      SELECT ti.*, p.name, p.barcode 
      FROM transaction_items ti 
      JOIN products p ON ti.product_id = p.id 
      WHERE ti.transaction_id = ?
    `, [id], (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ ...transaction, items });
    });
  });
});

// Users API
app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role = 'cashier' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
    [username, hashedPassword, role],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, message: 'User created successfully' });
    }
  );
});

app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  db.all(`SELECT id, username, role, created_at FROM users ORDER BY username`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Settings API
app.get('/api/settings', authenticateToken, (req, res) => {
  db.all(`SELECT key, value FROM settings`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  });
});

app.put('/api/settings', authenticateToken, requireAdmin, (req, res) => {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and value are required' });
  }

  db.run(
    `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [key, value],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Setting updated successfully' });
    }
  );
});

// Backup API
app.post('/api/backup/manual', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!backupManager || !backupManager.storage) {
      return res.status(400).json({ error: 'Backup not configured' });
    }
    await backupManager.manualBackup();
    res.json({ message: 'Backup started' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/backup/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!backupManager || !backupManager.storage) {
      return res.status(400).json({ error: 'Backup not configured' });
    }
    const backups = await backupManager.listBackups();
    res.json(backups);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/backup/restore', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Backup name required' });
    if (!backupManager || !backupManager.storage) {
      return res.status(400).json({ error: 'Backup not configured' });
    }
    await backupManager.restoreBackup(name);
    res.json({ message: 'Restore completed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reports API
app.get('/api/reports/sales', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;

  let query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as transactions,
      SUM(total) as revenue,
      AVG(total) as avg_transaction
    FROM transactions 
    WHERE status = 'completed'
  `;
  let params = [];

  if (start_date && end_date) {
    query += ' AND DATE(created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  query += ' GROUP BY DATE(created_at) ORDER BY date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/reports/inventory', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      p.name,
      p.stock,
      p.category,
      CASE 
        WHEN p.stock = 0 THEN 'Out of Stock'
        WHEN p.stock <= 10 THEN 'Low Stock'
        ELSE 'In Stock'
      END as status
    FROM products p
    ORDER BY p.stock ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Serve React app for all other routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Supermarket POS Server running on port ${PORT}`);
  console.log(`Database: ${dbPath}`);
  console.log(`Default admin credentials: admin/admin`);
});
