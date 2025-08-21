# 🛒 Supermarket POS System

A comprehensive, offline-first Point of Sale system for supermarkets built with React.js, Node.js, SQLite, and Electron. Features include product management, barcode scanning, inventory tracking, sales reports, and optional cloud backups to MEGA.

## ✨ Features

### Core POS Functions
- **User Authentication** - Secure login for cashiers and administrators
- **Product Catalog** - Manage products with barcodes, prices, and stock levels
- **Shopping Cart** - Add/remove items, calculate totals with taxes and discounts
- **Payment Processing** - Support for cash and card payments
- **Receipt Generation** - Print receipts using thermal printers
- **Barcode Scanning** - Webcam-based barcode scanning for product lookup

### Advanced Features
- **Real-time Inventory** - Automatic stock updates and low-stock alerts
- **Sales Reports** - Daily/weekly reports with exportable data
- **Customer Loyalty** - Track customer points and purchase history
- **Cloud Backups** - Optional MEGA cloud storage for data safety
- **Offline-First** - Works without internet connection
- **Multi-User Support** - Role-based access control (cashier/admin)

### Hardware Integration
- **USB Barcode Scanners** - Keyboard-emulating scanners (plug & play)
- **Thermal Printers** - ESC/POS compatible receipt printers
- **Touch Support** - Touch-friendly interface for tablet use

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Windows 10/11, macOS 10.15+, or Linux
- 2GB RAM minimum, 4GB recommended
- 1GB free disk space

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/supermarket-pos.git
   cd supermarket-pos
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

### Default Credentials
- **Admin**: `admin` / `admin`
- **Cashier**: `cashier` / `cashier`

⚠️ **Important**: Change default passwords after first login!

## 🏗️ Project Structure

```
supermarket-pos/
├── client/                 # React.js frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── index.js       # App entry point
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── server/                 # Node.js backend
│   ├── db/                # SQLite database
│   ├── routes/            # API endpoints
│   ├── index.js           # Server entry point
│   ├── backup.js          # MEGA backup utility
│   ├── printer.js         # Thermal printer utility
│   └── package.json       # Backend dependencies
├── electron/               # Electron configuration
│   └── main.js            # Main process
├── dist/                   # Built executables
└── package.json            # Root configuration
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the `server/` directory:

```env
# Server Configuration
PORT=5000
JWT_SECRET=your-super-secret-key-here

# MEGA Cloud Backup (Optional)
BACKUP_ENABLED=false
MEGA_EMAIL=your-email@example.com
MEGA_PASSWORD=your-mega-password

# Printer Configuration
PRINTER_ENABLED=false
PRINTER_INTERFACE=usb://0x04b8/0x0202

# Company Information
COMPANY_NAME=Your Supermarket Name
COMPANY_ADDRESS=123 Main St, City, State
```

### Database Setup
The SQLite database is automatically created on first run with these tables:
- `users` - User accounts and roles
- `products` - Product catalog and inventory
- `transactions` - Sales transactions
- `transaction_items` - Individual items in transactions
- `customers` - Customer information and loyalty points
- `settings` - System configuration

## 📱 Usage

### Cashier Interface
1. **Login** with cashier credentials
2. **Scan Products** using barcode scanner or search manually
3. **Manage Cart** - adjust quantities, apply discounts
4. **Process Payment** - select payment method and complete sale
5. **Print Receipt** - automatically prints to thermal printer

### Admin Interface
1. **Product Management** - Add, edit, and remove products
2. **Inventory Control** - Monitor stock levels and set alerts
3. **User Management** - Create and manage cashier accounts
4. **Sales Reports** - View daily, weekly, and monthly reports
5. **System Settings** - Configure backup, printer, and company info

### Barcode Scanning
- **USB Scanners**: Plug in and start scanning (no setup required)
- **Webcam Scanner**: Click "Scan Barcode" button and position barcode in view
- **Manual Entry**: Type barcode or product name in search field

## 🖨️ Printer Setup

### Supported Printers
- ESC/POS compatible thermal printers
- USB, Network, or Serial connections
- Common brands: Epson, Star, Citizen, etc.

### Configuration
1. Connect printer to computer
2. Note the USB interface ID (e.g., `usb://0x04b8/0x0202`)
3. Update `PRINTER_INTERFACE` in `.env` file
4. Set `PRINTER_ENABLED=true`
5. Test printing from Settings menu

### Troubleshooting
- **Printer not detected**: Check USB connection and interface ID
- **Print quality issues**: Clean print head and adjust settings
- **Paper jams**: Check paper feed and cutter mechanism

## ☁️ Cloud Backup

### MEGA Integration
- **Free Storage**: 20GB free storage included
- **Automatic Backups**: Daily backups at 2:00 AM
- **Manual Backups**: Trigger backups on demand
- **Restore Function**: Download and restore from any backup

### Setup
1. Create MEGA account at [mega.nz](https://mega.nz)
2. Enable 2FA for security
3. Add credentials to `.env` file
4. Set `BACKUP_ENABLED=true`
5. Test backup from Settings menu

### Backup Schedule
- **Daily**: Automatic backup at 2:00 AM
- **On Demand**: Manual backup from admin interface
- **Retention**: Keep all backups (manage manually in MEGA)

## 🚀 Building for Production

### Development Build
```bash
# Build React frontend
npm run build-client

# Start Electron with built frontend
npm run electron
```

### Production Build
```bash
# Build complete application
npm run build

# Output: dist/ folder with platform-specific executables
```

### Platform-Specific Builds
- **Windows**: `supermarket-pos.exe` (portable)
- **macOS**: `supermarket-pos.dmg`
- **Linux**: `supermarket-pos.AppImage`

## 📦 USB Deployment

### Preparation
1. **Build Application**: `npm run build`
2. **Format USB Drive**: FAT32 for maximum compatibility
3. **Copy Files**: Copy entire `dist/` folder to USB drive
4. **Add Instructions**: Include README.txt with setup steps

### Customer Installation
1. **Insert USB** into customer computer
2. **Copy Application** to local disk (recommended) or run from USB
3. **Run Executable** - no installation required
4. **First Login** - use default credentials then change passwords
5. **Hardware Setup** - connect scanner and printer
6. **Configure Settings** - company info, backup, printer

### USB Contents
```
USB Drive/
├── dist/
│   ├── supermarket-pos.exe    # Windows executable
│   ├── supermarket-pos.app    # macOS application
│   └── supermarket-pos        # Linux executable
├── README.txt                 # Installation instructions
└── Sample Data/               # Optional sample products
```

## 🧪 Testing

### Unit Tests
```bash
# Run backend tests
npm test

# Run frontend tests
cd client && npm test
```

### Integration Tests
- **Full Checkout Flow**: Scan → Add to Cart → Payment → Receipt
- **Inventory Updates**: Verify stock changes after transactions
- **User Permissions**: Test role-based access control
- **Hardware Integration**: Test scanner and printer functionality

### Performance Testing
- **Load Testing**: 1,000+ transactions per day
- **Database Performance**: <1 second query response times
- **Memory Usage**: <500MB RAM under normal operation
- **Storage**: <200MB per year for small supermarkets

## 🔒 Security Features

### Authentication
- **JWT Tokens**: Secure, time-limited authentication
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access**: Separate permissions for cashiers and admins

### Data Protection
- **Local Storage**: SQLite database with file-level encryption (optional)
- **Secure Backups**: Encrypted transmission to MEGA
- **Input Validation**: Server-side validation of all inputs
- **SQL Injection Protection**: Parameterized queries

### Network Security
- **CORS Protection**: Configured for local development
- **HTTPS Ready**: Can be deployed with SSL certificates
- **Firewall Friendly**: Only local network communication

## 📊 Monitoring & Maintenance

### Logs
- **Application Logs**: Console output and error tracking
- **Transaction Logs**: All sales and inventory changes
- **Error Logs**: System errors and debugging information

### Health Checks
- **Database Status**: Connection and performance monitoring
- **Printer Status**: Connection and paper status
- **Backup Status**: Last successful backup and storage usage
- **System Resources**: Memory and disk usage monitoring

### Updates
- **Application Updates**: Distribute new executables via USB
- **Database Updates**: Automatic schema migrations
- **Configuration Updates**: Environment variable changes

## 🆘 Troubleshooting

### Common Issues

#### Application Won't Start
- Check Node.js version (16+ required)
- Verify all dependencies are installed
- Check port 5000 is available
- Review console error messages

#### Database Errors
- Verify write permissions in server/db/ directory
- Check disk space availability
- Restore from backup if database is corrupted

#### Printer Issues
- Verify printer is powered on and connected
- Check USB interface ID in settings
- Test printer with manufacturer software
- Verify paper and ink/ribbon status

#### Scanner Problems
- USB scanners work as keyboards (no drivers needed)
- Webcam scanner requires camera permissions
- Check barcode quality and lighting
- Verify barcode format compatibility

#### Backup Failures
- Check internet connection
- Verify MEGA credentials
- Check available storage space
- Review backup logs for errors

### Getting Help
- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs on GitHub repository
- **Support**: Contact support team at support@example.com
- **Community**: Join our Discord server for help

## 🚀 Future Enhancements

### Planned Features
- **Multi-Store Sync**: Cloud-based synchronization across locations
- **Payment Integration**: Stripe, PayPal, and local payment processors
- **Advanced Analytics**: Machine learning insights and predictions
- **Mobile App**: Companion app for inventory management
- **API Integration**: Third-party accounting and ERP systems

### Scalability
- **Database**: PostgreSQL for larger deployments
- **Load Balancing**: Multiple server instances
- **Caching**: Redis for improved performance
- **Microservices**: Modular architecture for enterprise use

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 🙏 Acknowledgments

- **React Team** - Frontend framework
- **Node.js Community** - Backend runtime
- **SQLite** - Embedded database
- **Electron** - Desktop application framework
- **MEGA** - Cloud storage service

## 📞 Support & Contact

- **Project**: [GitHub Repository](https://github.com/your-username/supermarket-pos)
- **Documentation**: [Wiki](https://github.com/your-username/supermarket-pos/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/supermarket-pos/issues)
- **Email**: support@example.com
- **Discord**: [Join our server](https://discord.gg/your-invite)

---

**Made with ❤️ for supermarkets worldwide**

*This system is designed to be reliable, secure, and easy to use. It's perfect for small to medium-sized supermarkets looking for a professional POS solution without the complexity of enterprise systems.*
#   P O S  
 