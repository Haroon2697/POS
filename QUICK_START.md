# 🚀 Quick Start Guide - Supermarket POS System

## ⚡ Get Running in 5 Minutes

### 1. Install Dependencies
```bash
# Windows
install.bat

# Mac/Linux
chmod +x install.sh
./install.sh
```

### 2. Start the System
```bash
npm run dev
```

### 3. Open in Browser
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### 4. Login
- **Admin**: `admin` / `admin`
- **Cashier**: `cashier` / `cashier`

## 🎯 What You Can Do Right Now

### Cashier Mode
- ✅ Scan products with webcam barcode scanner
- ✅ Add items to cart manually
- ✅ Process transactions with cash/card
- ✅ View product catalog and search
- ✅ Calculate totals with tax and discounts

### Admin Mode
- ✅ Add/edit/delete products
- ✅ Manage inventory levels
- ✅ View sales reports
- ✅ Configure system settings
- ✅ Manage user accounts

## 🔧 Quick Configuration

### Enable Barcode Scanner
1. Click "Scan Barcode" button in POS
2. Position barcode in webcam view
3. System automatically adds product to cart

### Add Sample Products
1. Login as admin
2. Go to Products section
3. Click "Add Product"
4. Fill in: Name, Price, Stock, Category

### Configure Company Info
1. Go to Settings
2. Update Company Name and Address
3. Set Tax Rate (e.g., 0.08 for 8%)
4. Save settings

## 🖨️ Printer Setup (Optional)

### 1. Connect Thermal Printer
- USB connection (plug & play)
- ESC/POS compatible models

### 2. Find USB Interface ID
- Windows: Check Device Manager
- Mac/Linux: Use `lsusb` command
- Format: `usb://vendor_id/product_id`

### 3. Enable in Settings
- Go to Settings → Receipt Printer
- Check "Enable receipt printing"
- Enter USB interface ID
- Test with "Test Printer" button

## ☁️ Cloud Backup (Optional)

### 1. Create MEGA Account
- Visit [mega.nz](https://mega.nz)
- Sign up for free 20GB storage

### 2. Configure Credentials
- Edit `server/env.example`
- Add MEGA email and password
- Rename to `.env`

### 3. Enable Backups
- Go to Settings → Cloud Backup
- Check "Enable automatic cloud backups"
- Test with "Manual Backup" button

## 📱 Hardware Integration

### USB Barcode Scanner
- **No setup required** - works as keyboard
- Scan barcode → product automatically added
- Compatible with most USB scanners

### Thermal Receipt Printer
- ESC/POS compatible models
- USB, Network, or Serial connections
- Automatic printing on checkout

### Touch Support
- Touch-friendly interface
- Large buttons for tablet use
- Responsive design for all screen sizes

## 🚨 Troubleshooting

### System Won't Start
```bash
# Check Node.js version
node --version  # Should be 16+

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database Errors
```bash
# Check permissions
ls -la server/db/

# Reset database (WARNING: loses all data)
rm server/db/pos.db
npm run dev  # Recreates database
```

### Scanner Not Working
- Check camera permissions in browser
- Ensure good lighting on barcode
- Try different barcode formats
- USB scanners work without setup

### Printer Issues
- Verify printer is powered on
- Check USB connection
- Verify interface ID format
- Test with manufacturer software

## 📊 Sample Data

### Quick Product Setup
```sql
-- Add sample products via admin interface
Milk - $2.99 - Stock: 100 - Category: Dairy
Bread - $1.99 - Stock: 50 - Category: Bakery
Apples - $0.99 - Stock: 200 - Category: Produce
```

### Test Transaction
1. Add products to cart
2. Apply discount if needed
3. Select payment method
4. Complete checkout
5. Verify receipt printing

## 🔒 Security Notes

### Change Default Passwords
- **Immediately** after first login
- Use strong passwords
- Enable 2FA on MEGA account if using backups

### Environment Variables
- Keep `.env` file secure
- Don't commit credentials to git
- Use different JWT secrets in production

## 📞 Need Help?

### Check These First
- ✅ Node.js 16+ installed
- ✅ All dependencies installed
- ✅ Port 5000 available
- ✅ Browser camera permissions

### Common Issues
- **Port 5000 in use**: Change in `server/.env`
- **Database locked**: Check file permissions
- **Scanner not working**: Try different barcode
- **Printer errors**: Verify USB interface ID

### Getting Support
- Check console error messages
- Review README.md for details
- Contact support team

---

**🎉 You're ready to run a supermarket!**

The system is designed to work immediately with minimal setup. Start with cashier operations, then explore admin features as you become comfortable with the interface.
