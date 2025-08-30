# POS System Troubleshooting Guide

## 🚨 Critical Issues Fixed

### 1. Printer Manager Crashes
**Problem**: Server crashes due to `printerManager` errors
**Solution**: Added robust error handling and mock mode fallback

### 2. Proxy Connection Errors
**Problem**: Frontend can't connect to backend (ECONNREFUSED)
**Solution**: Fixed server crashes and added health check endpoints

### 3. Windows Compatibility
**Problem**: Thermal printer library issues on Windows
**Solution**: Added Windows-specific interface detection and mock mode

## 🔧 Quick Fixes

### Test Server Startup
```bash
cd server
node test-server.js
```

### Check Server Health
```bash
curl http://localhost:5000/api/health
```

### Test Printer Status
```bash
curl http://localhost:5000/api/printer/status
```

## 🖨️ Printer Setup

### Hardware Printer
1. Connect thermal printer via USB/Serial
2. Install printer drivers
3. Note the interface (USB, COM1, COM2, etc.)
4. Configure via `/api/printer/configure` endpoint

### Mock Mode (Development)
- If no hardware printer is available, the system will use mock mode
- Receipts are logged to console instead of printed
- Perfect for development and testing

## 🌐 Network Issues

### Proxy Configuration
Ensure React app has correct proxy in `package.json`:
```json
{
  "proxy": "http://localhost:5000"
}
```

### Port Conflicts
If port 5000 is busy:
```bash
# Check what's using port 5000
netstat -aon | findstr :5000

# Change port in server/index.js
const PORT = process.env.PORT || 5001;
```

### CORS Issues
CORS is enabled by default. If you need specific origins:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://yourdomain.com']
}));
```

## 🗄️ Database Issues

### Database Path
Check database location in logs:
```
Database: /path/to/pos.db
```

### Backup Issues
Automatic backups run daily. Check `db/` folder for backup files.

## 📱 Frontend Issues

### Build Problems
```bash
cd client
npm run build
```

### Development Mode
```bash
cd client
npm start
```

## 🚀 Production Deployment

### Environment Variables
Create `.env` file:
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secret-key
DB_PATH=/path/to/production/db
```

### Process Management
Use PM2 for production:
```bash
npm install -g pm2
pm2 start server/index.js --name "pos-server"
pm2 startup
pm2 save
```

## 📊 Monitoring

### Health Check
- Endpoint: `/api/health`
- Returns server status, uptime, and component health

### Logs
- Check console output for errors
- Look for printer initialization messages
- Monitor database connection status

## 🔍 Common Error Messages

### "Printer manager not available"
- Check if `printer.js` exists
- Verify `node-thermal-printer` is installed
- System will continue in mock mode

### "Database error"
- Check database file permissions
- Ensure database directory exists
- Verify SQLite installation

### "ECONNREFUSED"
- Backend server is not running
- Port is blocked or in use
- Check firewall settings

## 📞 Support

If issues persist:
1. Check server logs for detailed error messages
2. Verify all dependencies are installed
3. Test with the provided test scripts
4. Check network and firewall settings

## 🎯 Next Steps

1. **Test the server**: Run `node test-server.js`
2. **Check health**: Visit `/api/health` endpoint
3. **Test printer**: Use `/api/printer/status` endpoint
4. **Start frontend**: Run `npm start` in client directory
5. **Verify proxy**: Check if API calls work from frontend
