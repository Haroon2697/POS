const ThermalPrinter = require('node-thermal-printer').printer;
const Types = require('node-thermal-printer').types;

class PrinterManager {
  constructor() {
    this.printer = null;
    this.printerConfig = {
      type: Types.EPSON,
      interface: 'usb://0x04b8/0x0202', // Default USB interface
      options: {
        timeout: 1000
      },
      width: 42 // Receipt width in characters
    };
  }

  async initialize(interfacePath = null) {
    try {
      if (interfacePath) {
        this.printerConfig.interface = interfacePath;
      }

      this.printer = new ThermalPrinter(this.printerConfig);
      
      // Test connection
      await this.printer.isPrinterConnected();
      console.log('Thermal printer connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect to printer:', error.message);
      return false;
    }
  }

  async printReceipt(transaction) {
    if (!this.printer) {
      throw new Error('Printer not initialized');
    }

    try {
      // Get company settings (you can customize these)
      const companyName = 'Supermarket POS';
      const companyAddress = '123 Main St, City, State';
      const phone = '+1 (555) 123-4567';

      // Start printing
      this.printer.alignCenter();
      this.printer.bold(true);
      this.printer.println(companyName);
      this.printer.bold(false);
      this.printer.println(companyAddress);
      this.printer.println(phone);
      this.printer.drawLine();

      // Transaction header
      this.printer.alignLeft();
      this.printer.println(`Transaction #: ${transaction.id}`);
      this.printer.println(`Date: ${new Date(transaction.created_at).toLocaleString()}`);
      this.printer.println(`Cashier: ${transaction.cashier_name || 'Unknown'}`);
      this.printer.drawLine();

      // Items
      this.printer.println('ITEMS:');
      this.printer.drawLine();

      transaction.items.forEach((item) => {
        this.printer.println(`${item.name}`);
        this.printer.println(`  ${item.quantity} x $${item.unit_price.toFixed(2)} = $${item.subtotal.toFixed(2)}`);
      });

      this.printer.drawLine();

      // Totals
      const subtotal = transaction.items.reduce((sum, item) => sum + item.subtotal, 0);
      const tax = transaction.tax_amount || 0;
      const discount = transaction.discount_amount || 0;
      const total = transaction.total;

      this.printer.alignRight();
      this.printer.println(`Subtotal: $${subtotal.toFixed(2)}`);
      
      if (tax > 0) {
        this.printer.println(`Tax: $${tax.toFixed(2)}`);
      }
      
      if (discount > 0) {
        this.printer.println(`Discount: -$${discount.toFixed(2)}`);
      }

      this.printer.bold(true);
      this.printer.println(`TOTAL: $${total.toFixed(2)}`);
      this.printer.bold(false);

      // Payment method
      this.printer.alignLeft();
      this.printer.println(`Payment: ${transaction.payment_method.toUpperCase()}`);

      // Customer info if available
      if (transaction.customer_email) {
        this.printer.println(`Customer: ${transaction.customer_email}`);
      }

      // Footer
      this.printer.alignCenter();
      this.printer.drawLine();
      this.printer.println('Thank you for your purchase!');
      this.printer.println('Please come again');
      this.printer.drawLine();

      // Cut paper
      this.printer.cut();

      // Execute print job
      await this.printer.execute();
      console.log('Receipt printed successfully');
      return true;
    } catch (error) {
      console.error('Failed to print receipt:', error.message);
      throw error;
    }
  }

  async printTestPage() {
    if (!this.printer) {
      throw new Error('Printer not initialized');
    }

    try {
      this.printer.alignCenter();
      this.printer.bold(true);
      this.printer.println('PRINTER TEST PAGE');
      this.printer.bold(false);
      this.printer.drawLine();
      
      this.printer.alignLeft();
      this.printer.println('This is a test page to verify');
      this.printer.println('printer connectivity and settings.');
      this.printer.println('');
      this.printer.println('Current time: ' + new Date().toLocaleString());
      this.printer.println('Printer interface: ' + this.printerConfig.interface);
      
      this.printer.drawLine();
      this.printer.alignCenter();
      this.printer.println('Test completed successfully!');
      this.printer.cut();
      
      await this.printer.execute();
      console.log('Test page printed successfully');
      return true;
    } catch (error) {
      console.error('Failed to print test page:', error.message);
      throw error;
    }
  }

  async getPrinterStatus() {
    if (!this.printer) {
      return { connected: false, error: 'Printer not initialized' };
    }

    try {
      const connected = await this.printer.isPrinterConnected();
      return { connected, error: null };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  setPrinterInterface(interfacePath) {
    this.printerConfig.interface = interfacePath;
    console.log(`Printer interface set to: ${interfacePath}`);
  }

  async disconnect() {
    if (this.printer) {
      try {
        // Close any open connections
        this.printer = null;
        console.log('Printer disconnected');
      } catch (error) {
        console.error('Error disconnecting printer:', error.message);
      }
    }
  }
}

module.exports = PrinterManager;
