const os = require('os');

class PrinterManager {
  constructor() {
    this.printer = null;
    this.isWindows = os.platform() === 'win32';
    this.printerConfig = {
      type: 'epson',
      interface: this.isWindows ? 'USB' : 'usb://0x04b8/0x0202',
      options: {
        timeout: 3000,
        removeSpecialCharacters: false
      },
      width: 42 // Receipt width in characters
    };
    
    // Try to load thermal printer library
    try {
      const ThermalPrinter = require('node-thermal-printer').printer;
      const Types = require('node-thermal-printer').types;
      this.ThermalPrinter = ThermalPrinter;
      this.Types = Types;
      this.printerConfig.type = Types.EPSON;
    } catch (error) {
      console.log('Thermal printer library not available:', error.message);
      this.ThermalPrinter = null;
      this.Types = null;
    }
  }

  async initialize(interfacePath = null) {
    try {
      if (!this.ThermalPrinter) {
        console.log('Thermal printer library not available - using mock mode');
        this.printer = { isMock: true };
        return true;
      }

      if (interfacePath) {
        this.printerConfig.interface = interfacePath;
      }

      // On Windows, try different interface options
      if (this.isWindows && !interfacePath) {
        const interfaces = ['USB', 'COM1', 'COM2', 'COM3', 'LPT1'];
        for (const intf of interfaces) {
          try {
            this.printerConfig.interface = intf;
            this.printer = new this.ThermalPrinter(this.printerConfig);
            await this.printer.isPrinterConnected();
            console.log(`Thermal printer connected successfully on ${intf}`);
            return true;
          } catch (error) {
            console.log(`Failed to connect on ${intf}:`, error.message);
            continue;
          }
        }
        // If all interfaces fail, use mock mode
        console.log('All printer interfaces failed - using mock mode');
        this.printer = { isMock: true };
        return true;
      } else {
        this.printer = new this.ThermalPrinter(this.printerConfig);
        await this.printer.isPrinterConnected();
        console.log('Thermal printer connected successfully');
        return true;
      }
    } catch (error) {
      console.error('Failed to connect to printer:', error.message);
      // Fallback to mock mode
      this.printer = { isMock: true };
      console.log('Using mock printer mode');
      return true;
    }
  }

  async printReceipt(transaction) {
    if (!this.printer) {
      throw new Error('Printer not initialized');
    }

    // If using mock mode, just log the receipt
    if (this.printer.isMock) {
      console.log('=== MOCK RECEIPT PRINT ===');
      console.log('CASH RECEIPT');
      console.log('************************');
      console.log('Description                    Price');
      transaction.items.forEach((item) => {
        const name = item.name.length > 20 ? item.name.substring(0, 20) : item.name;
        const price = item.unit_price.toFixed(2);
        console.log(`${name.padEnd(20)}${price.padStart(10)}`);
      });
      console.log('************************');
      const subtotal = transaction.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const total = subtotal;
      const cashReceived = transaction.cash_received || total;
      const change = cashReceived - total;
      console.log(`Total:${total.toFixed(2).padStart(25)}`);
      console.log(`Cash:${cashReceived.toFixed(2).padStart(25)}`);
      console.log(`Change:${change.toFixed(2).padStart(23)}`);
      console.log('************************');
      console.log('Thank you for your purchase!');
      console.log('=== END MOCK RECEIPT ===');
      return true;
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

    // If using mock mode, just log the test page
    if (this.printer.isMock) {
      console.log('=== MOCK TEST PAGE ===');
      console.log('PRINTER TEST PAGE');
      console.log('This is a test page to verify');
      console.log('printer connectivity and settings.');
      console.log('');
      console.log('Current time: ' + new Date().toLocaleString());
      console.log('Printer interface: Mock Mode');
      console.log('Test completed successfully!');
      console.log('=== END TEST PAGE ===');
      return true;
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

    if (this.printer.isMock) {
      return { connected: true, mode: 'mock', error: null };
    }

    try {
      const connected = await this.printer.isPrinterConnected();
      return { connected, mode: 'hardware', error: null };
    } catch (error) {
      return { connected: false, mode: 'hardware', error: error.message };
    }
  }

  setPrinterInterface(interfacePath) {
    this.printerConfig.interface = interfacePath;
    console.log(`Printer interface set to: ${interfacePath}`);
  }

  async disconnect() {
    if (this.printer && !this.printer.isMock) {
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
