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
      // Clean header with asterisks
      this.printer.alignCenter();
      this.printer.println('************************');
      this.printer.bold(true);
      this.printer.println('CASH RECEIPT');
      this.printer.bold(false);
      this.printer.println('************************');

      // Items section with headers
      this.printer.alignLeft();
      this.printer.bold(true);
      this.printer.println('Description                    Price');
      this.printer.bold(false);
      
      // Print each item
      transaction.items.forEach((item) => {
        const name = item.name.length > 20 ? item.name.substring(0, 20) : item.name;
        const price = item.unit_price.toFixed(2);
        this.printer.println(`${name.padEnd(20)}${price.padStart(10)}`);
      });

      // Separator line
      this.printer.println('************************');

      // Calculate totals
      const subtotal = transaction.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const total = subtotal; // No discount
      const cashReceived = transaction.cash_received || total; // Default to total if not specified
      const change = cashReceived - total;

      // Summary section
      this.printer.bold(true);
      this.printer.println(`Total:${total.toFixed(2).padStart(25)}`);
      this.printer.println(`Cash:${cashReceived.toFixed(2).padStart(25)}`);
      this.printer.println(`Change:${change.toFixed(2).padStart(23)}`);
      this.printer.bold(false);

      // Footer
      this.printer.alignCenter();
      this.printer.println('************************');
      this.printer.println('Thank you for your purchase!');
      this.printer.println('************************');

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
