const fs = require('fs');
const schedule = require('node-schedule');
const path = require('path');
require('dotenv').config();

class BackupManager {
  constructor() {
    this.storage = null;
    const configuredDbPath = process.env.DB_PATH || path.join('db', 'pos.db');
    this.dbPath = path.isAbsolute(configuredDbPath)
      ? configuredDbPath
      : path.join(__dirname, configuredDbPath);
    this.backupEnabled = process.env.BACKUP_ENABLED === 'true';
    this.megaEmail = process.env.MEGA_EMAIL;
    this.megaPassword = process.env.MEGA_PASSWORD;
  }

  async initialize() {
    if (!this.backupEnabled || !this.megaEmail || !this.megaPassword) {
      console.log('Backup not configured. Set BACKUP_ENABLED=true and MEGA credentials in .env');
      return;
    }

    try {
      const { Storage } = require('megajs');
      this.storage = new Storage({
        email: this.megaEmail,
        password: this.megaPassword,
      });

      await this.storage.ready;
      console.log('MEGA backup initialized successfully');
      this.scheduleBackups();
    } catch (error) {
      console.error('Failed to initialize MEGA backup:', error.message);
    }
  }

  scheduleBackups() {
    // Schedule daily backup at 2 AM
    schedule.scheduleJob('0 2 * * *', () => {
      this.performBackup();
    });

    console.log('Daily backup scheduled at 2:00 AM');
  }

  async performBackup() {
    if (!this.storage || !fs.existsSync(this.dbPath)) {
      console.log('Backup skipped: storage not initialized or database not found');
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `pos-backup-${timestamp}.db`;
      const backupPath = path.join(__dirname, 'db', backupFileName);

      // Create a copy of the database
      fs.copyFileSync(this.dbPath, backupPath);

      console.log(`Starting backup: ${backupFileName}`);

      // Upload to MEGA
      await this.uploadToMega(backupPath, backupFileName);

      // Clean up local backup file
      fs.unlinkSync(backupPath);

      console.log(`Backup completed successfully: ${backupFileName}`);
    } catch (error) {
      console.error('Backup failed:', error.message);
    }
  }

  async uploadToMega(filePath, fileName) {
    const file = await this.storage.upload(fileName, fs.createReadStream(filePath)).complete;
    return file;
  }

  async manualBackup() {
    console.log('Manual backup requested...');
    await this.performBackup();
  }

  async listBackups() {
    if (!this.storage) {
      throw new Error('MEGA storage not initialized');
    }

    const files = await this.storage.root.children;
    return files
      .filter(file => file.name && file.name.startsWith('pos-backup-'))
      .map(file => ({ name: file.name, size: file.size, createdAt: file.timestamp }));
  }

  async restoreBackup(backupName) {
    if (!this.storage) {
      throw new Error('MEGA storage not initialized');
    }

    try {
      const restorePath = path.join(__dirname, 'db', 'pos-restore.db');
      
      // Download backup from MEGA
      await this.downloadFromMega(backupName, restorePath);

      // Verify the backup file
      if (!fs.existsSync(restorePath)) {
        throw new Error('Failed to download backup file');
      }

      // Create a backup of current database
      const currentBackup = path.join(__dirname, 'db', `pos-current-${Date.now()}.db`);
      fs.copyFileSync(this.dbPath, currentBackup);

      // Replace current database with backup
      fs.copyFileSync(restorePath, this.dbPath);

      // Clean up
      fs.unlinkSync(restorePath);
      fs.unlinkSync(currentBackup);

      console.log(`Database restored from backup: ${backupName}`);
      return true;
    } catch (error) {
      console.error('Restore failed:', error.message);
      throw error;
    }
  }

  async downloadFromMega(fileName, localPath) {
    const fileNode = (await this.storage.root.children).find(f => f.name === fileName);
    if (!fileNode) throw new Error('Backup not found in MEGA');
    const writeStream = fs.createWriteStream(localPath);
    await fileNode.download().pipe(writeStream);
    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }
}

module.exports = BackupManager;
