import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  QrCode,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Package,
  Store,
  Edit3,
  FileText,
  Smartphone
} from 'lucide-react';
import axios from 'axios';
import { BrowserMultiFormatReader } from '@zxing/browser';

function POS() {
  // Mode switching state
  const [currentMode, setCurrentMode] = useState('sales'); // 'sales' or 'inventory'
  
  // Sales mode states
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerAmount, setCustomerAmount] = useState('');
  const [showChange, setShowChange] = useState(false);
  
  // Inventory mode states
  const [productForm, setProductForm] = useState({
    name: '',
    barcode: '',
    price: '',
    stock: '',
    description: ''
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  
  // Scanner states
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const videoRef = useRef(null);
  
  // Products state
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch products');
    }
  };

  // Mode switching functions
  const switchToSalesMode = () => {
    setCurrentMode('sales');
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      barcode: '',
      price: '',
      stock: '',
      description: ''
    });
    toast.success('Switched to Sales Mode');
  };

  const switchToInventoryMode = () => {
    setCurrentMode('inventory');
    setShowProductForm(false);
    setEditingProduct(null);
    toast.success('Switched to Inventory Mode');
  };

  // Cart functions
  const addToCart = useCallback((product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
       
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          toast.error(`Only ${product.stock} in stock`);
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        if (product.stock > 0) {
          toast.success(`${product.name} added to cart`);
          return [...prevCart, { ...product, quantity: 1 }];
        } else {
          toast.error('Product out of stock');
          return prevCart;
        }
      }
    });
  }, []);

  // Barcode scanner handler with mode awareness
  const handleBarcodeScan = useCallback(async (scannedCode) => {
    if (!scannedCode.trim()) return;
    
    const product = products.find(p => p.barcode === scannedCode.trim());
    
    if (currentMode === 'inventory') {
      if (product) {
        // Load existing product for editing
        setEditingProduct(product);
        setProductForm({
          name: product.name,
          barcode: product.barcode,
          price: product.price.toString(),
          stock: product.stock.toString(),
          description: product.description || ''
        });
        setShowProductForm(true);
        toast.success(`Editing: ${product.name}`);
      } else {
        // Create new product with scanned barcode
        setProductForm({
          name: '',
          barcode: scannedCode.trim(),
          price: '',
          stock: '',
          description: ''
        });
        setEditingProduct(null);
        setShowProductForm(true);
        toast.success('New product - barcode scanned');
      }
    } else if (currentMode === 'sales') {
      if (product) {
        // Add product to cart for sale
        addToCart(product);
        toast.success(`Scanned: ${product.name}`);
      } else {
        toast.error('Product not found. Switch to Inventory mode to add.');
      }
    }
    
    setManualBarcode(''); // Clear input field
  }, [currentMode, products, addToCart]);

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (newQuantity > product.stock) {
      toast.error(`Only ${product.stock} in stock`);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setCustomerAmount('');
    setShowChange(false);
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTotal = () => {
    return getSubtotal();
  };

  const getChange = () => {
    const total = getTotal();
    const customerPaid = parseFloat(customerAmount) || 0;
    return customerPaid - total;
  };

  const handleCustomerAmountChange = (amount) => {
    setCustomerAmount(amount);
    if (amount && parseFloat(amount) >= getTotal()) {
      setShowChange(true);
    } else {
      setShowChange(false);
    }
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (getTotal() <= 0) {
      toast.error('Total must be greater than 0');
      return;
    }

    // Check if customer amount is sufficient for cash payments
    if (paymentMethod === 'cash' && (!customerAmount || parseFloat(customerAmount) < getTotal())) {
      toast.error('Customer amount must be greater than or equal to total');
      return;
    }

    try {
      const transactionData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        })),
        payment_method: paymentMethod,
      };

      const response = await axios.post('/api/transactions', transactionData);
      
      // Print receipt
      try {
        await axios.post('/api/print-receipt', {
          transaction_id: response.data.transaction_id,
          cash_received: parseFloat(customerAmount) || getTotal()
        });
      } catch (printError) {
        console.error('Failed to print receipt:', printError);
      }

      toast.success(`Transaction completed! ID: ${response.data.transaction_id}`);
      clearCart();
      setPaymentMethod('cash');
    } catch (error) {
      toast.error('Payment failed: ' + (error.response?.data?.error || error.message));
    }
  };

  // Inventory management functions
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    if (!productForm.name || !productForm.barcode || !productForm.price || !productForm.stock) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        await axios.put(`/api/products/${editingProduct.id}`, {
          name: productForm.name,
          barcode: productForm.barcode,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock),
          description: productForm.description
        });
        toast.success('Product updated successfully');
      } else {
        // Create new product
        await axios.post('/api/products', {
          name: productForm.name,
          barcode: productForm.barcode,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock),
          description: productForm.description
        });
        toast.success('Product added successfully');
      }
      
      fetchProducts();
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        barcode: '',
        price: '',
        stock: '',
        description: ''
      });
    } catch (error) {
      toast.error('Failed to save product: ' + (error.response?.data?.error || error.message));
    }
  };

  const deleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`/api/products/${productId}`);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const startScanning = () => {
    setScanning(true);
  };

  const stopScanning = useCallback(() => {
    setScanning(false);
    if (scanner) {
      try {
        scanner.reset();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  }, [scanner]);

  useEffect(() => {
    let codeReader = null;
    
    if (scanning && videoRef.current) {
      try {
        codeReader = new BrowserMultiFormatReader();
        setScanner(codeReader);

        codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
          if (result) {
            handleBarcodeScan(result.text);
            stopScanning();
          }
          if (err && err.name !== 'NotFoundException') {
            console.error('Scanning error:', err);
          }
        });
      } catch (error) {
        console.error('Error starting scanner:', error);
        toast.error('Failed to start camera scanner');
        setScanning(false);
      }
    }

    return () => {
      if (codeReader) {
        try {
          codeReader.reset();
        } catch (error) {
          console.error('Error cleaning up scanner:', error);
        }
      }
    };
  }, [scanning, handleBarcodeScan, stopScanning]);

  const handleManualScan = (barcode) => {
    handleBarcodeScan(barcode);
  };



  const downloadCsvTemplate = () => {
    const csvContent = "Name,Barcode,Price,Stock,Description\n";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV template downloaded');
  };

  const handleCsvFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        const products = [];
        for (let i = 1; i < lines.length; i++) {
          const currentline = lines[i].split(',');
          if (currentline.length > 1) {
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
              obj[headers[j].trim()] = currentline[j].trim();
            }
            products.push(obj);
          }
        }
        setCsvData(products);
        setCsvPreview(products.slice(0, 5)); // Preview first 5 rows
        toast.success(`${products.length} products found in CSV`);
      };
      reader.readAsText(file);
    }
  };

  const importCsvProducts = async () => {
    if (csvData.length === 0) {
      toast.error('No products to import from CSV.');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    const totalProducts = csvData.length;
    let importedCount = 0;

    for (let i = 0; i < totalProducts; i++) {
      const product = csvData[i];
      const productExists = products.some(p => p.barcode === product.Barcode);

      if (productExists) {
        toast.warn(`Product with barcode ${product.Barcode} already exists. Skipping.`);
      } else {
        try {
          await axios.post('/api/products', {
            name: product.Name,
            barcode: product.Barcode,
            price: parseFloat(product.Price),
            stock: parseInt(product.Stock),
            description: product.Description || ''
          });
          importedCount++;
          setImportProgress((importedCount / totalProducts) * 100);
          toast.success(`Product ${product.Name} added successfully.`);
        } catch (error) {
          toast.error(`Failed to import product ${product.Name}: ${error.response?.data?.error || error.message}`);
        }
      }
    }
    setIsImporting(false);
    fetchProducts();
    toast.success(`Successfully imported ${importedCount} products.`);
    setShowCsvImport(false);
    setCsvData([]);
    setCsvPreview([]);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Side - Products and Cart */}
      <div className="flex-1 flex flex-col">
                 {/* Header with Mode Switching */}
         <div className="bg-white shadow-sm border-b px-4 py-3">
           <div className="flex items-center justify-between">
             <div>
               <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
             </div>
            
            {/* Mode Switching Buttons */}
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 rounded-md p-1">
                <button
                  onClick={switchToSalesMode}
                  className={`px-3 py-1.5 rounded font-medium transition-colors text-sm ${
                    currentMode === 'sales'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Store className="w-3 h-3 mr-1 inline" />
                  Sales
                </button>
                <button
                  onClick={switchToInventoryMode}
                  className={`px-3 py-1.5 rounded font-medium transition-colors text-sm ${
                    currentMode === 'inventory'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Package className="w-3 h-3 mr-1 inline" />
                  Inventory
                </button>
              </div>
              
              {currentMode === 'sales' && (
                <button
                  onClick={clearCart}
                  className="btn btn-secondary btn-sm"
                >
                  Clear Cart
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
                     {/* Left Panel - Products (60-65% width) */}
           <div className="w-2/3 bg-gray-50 p-3 overflow-y-auto">
            {currentMode === 'sales' ? (
              <>
                                 {/* Category Navigation */}
                 <div className="mb-3">
                   <div className="flex space-x-1.5 overflow-x-auto pb-1.5">
                     <button className="px-2 py-1 bg-blue-600 text-white rounded font-medium whitespace-nowrap text-xs">
                       All Products
                     </button>
                     <button className="px-2 py-1 bg-white text-gray-700 rounded font-medium hover:bg-gray-50 whitespace-nowrap text-xs">
                       Groceries
                     </button>
                     <button className="px-2 py-1 bg-white text-gray-700 rounded font-medium hover:bg-gray-50 whitespace-nowrap text-xs">
                       Beverages
                     </button>
                     <button className="px-2 py-1 bg-white text-gray-700 rounded font-medium hover:bg-gray-50 whitespace-nowrap text-xs">
                       Snacks
                     </button>
                     <button className="px-2 py-1 bg-white text-gray-700 rounded font-medium hover:bg-gray-50 whitespace-nowrap text-xs">
                       Household
                     </button>
                     <button className="px-2 py-1 bg-white text-gray-700 rounded font-medium whitespace-nowrap text-xs">
                       Electronics
                     </button>
                   </div>
                 </div>



                                 {/* Barcode Scanner */}
                 <div className="mb-4">
                   <div className="bg-white p-3 rounded-md border border-gray-200">
                     <div className="flex items-center justify-between mb-3">
                       <h3 className="text-base font-semibold text-gray-900">Barcode Scanner</h3>
                       <button
                         onClick={scanning ? stopScanning : startScanning}
                         className={`px-3 py-1.5 rounded-md font-medium transition-colors text-sm ${
                           scanning 
                             ? 'bg-red-500 text-white hover:bg-red-600' 
                             : 'bg-blue-600 text-white hover:bg-blue-700'
                         }`}
                       >
                         <QrCode className="w-3 h-3 mr-1 inline" />
                         {scanning ? 'Stop Scanning' : 'Scan Barcode'}
                       </button>
                     </div>
                     
                     {scanning && (
                       <div className="text-center py-6">
                         <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                           <QrCode className="w-6 h-6 text-blue-600" />
                         </div>
                         <p className="text-gray-600 text-sm">Scanning for barcodes...</p>
                         <p className="text-xs text-gray-500 mt-1">Point camera at product barcode</p>
                       </div>
                     )}
                   </div>
                 </div>

                                 {/* Manual Barcode Input */}
                 <div className="mb-3">
                   <div className="bg-white p-3 rounded-md border border-gray-200">
                     <h3 className="text-base font-semibold text-gray-900 mb-2">Manual Barcode Entry</h3>
                     <div className="flex space-x-1.5">
                       <input
                         type="text"
                         value={manualBarcode}
                         onChange={(e) => setManualBarcode(e.target.value)}
                         placeholder="Enter barcode manually"
                         className="flex-1 py-1.5 px-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                         onKeyPress={(e) => {
                           if (e.key === 'Enter') {
                             handleManualScan(manualBarcode);
                           }
                         }}
                       />
                       <button
                         onClick={() => handleManualScan(manualBarcode)}
                         className="px-3 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors text-sm"
                       >
                         Add to Cart
                       </button>
                       <button
                         onClick={() => setManualBarcode('')}
                         className="px-2 py-1.5 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300 transition-colors text-sm"
                       >
                         Clear
                       </button>
                     </div>
                     <p className="text-xs text-gray-500 mt-1.5">
                       Enter the product barcode and press Enter or click "Add to Cart"
                     </p>
                   </div>
                 </div>

                                 {/* Products Grid */}
                 <div className="product-grid-compact">
                   {products.map((product) => (
                     <div
                       key={product.id}
                       onClick={() => addToCart(product)}
                       className="product-card-compact"
                     >
                       <div className="w-full h-16 bg-gray-200 rounded mb-1.5 flex items-center justify-center">
                         <Package className="w-6 h-6 text-gray-400" />
                       </div>
                       <h3 className="font-medium text-gray-900 mb-1 text-xs truncate">{product.name}</h3>
                       <p className="text-xs text-gray-500 mb-1.5 line-clamp-2">{product.description || 'No description'}</p>
                       <div className="flex items-center justify-between">
                         <span className="text-sm font-bold text-blue-600">₨{product.price.toFixed(2)}</span>
                         <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                       </div>
                     </div>
                   ))}
                 </div>
              </>
            ) : (
              // Inventory Mode
              <div className="space-y-6">
                {/* Mode-specific content */}
                {currentMode === 'inventory' && (
                  <div className="mb-4 space-y-3">
                    <button
                      onClick={() => {
                        setShowProductForm(true);
                        setEditingProduct(null);
                        setProductForm({
                          name: '',
                          barcode: '',
                          price: '',
                          stock: '',
                          description: ''
                        });
                      }}
                      className="w-full bg-blue-600 text-white py-2 px-3 rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2 inline" />
                      Add New Product
                    </button>
                    
                    <button
                      onClick={() => setShowCsvImport(true)}
                      className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded-md font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Package className="w-4 h-4 mr-2 inline" />
                      Import Products (CSV)
                    </button>
                  </div>
                )}

                {/* Products List for Inventory */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Products</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {products.map((product) => (
                      <div key={product.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{product.name}</h4>
                              <p className="text-sm text-gray-500">{product.barcode || 'No barcode'}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-lg font-semibold text-blue-600">₨{product.price.toFixed(2)}</span>
                            <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setProductForm({
                                    name: product.name,
                                    barcode: product.barcode || '',
                                    price: product.price.toString(),
                                    stock: product.stock.toString(),
                                    description: product.description || ''
                                  });
                                  setShowProductForm(true);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteProduct(product.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Cart (35-40% width) */}
          <div className="w-1/3 bg-white border-l border-gray-200 cart-container">
            {currentMode === 'sales' ? (
              <>
                                 {/* Cart Header */}
                 <div className="cart-header">
                   <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center space-x-2">
                       <FileText className="w-4 h-4 text-blue-600" />
                       <h2 className="text-lg font-bold text-gray-900">Shopping Cart</h2>
                     </div>
                     <div className="text-xs text-gray-500">
                       {cart.length} item{cart.length !== 1 ? 's' : ''}
                     </div>
                   </div>
                 </div>

                                 {/* Cart Items */}
                 <div className="cart-items-area p-3">
                   {cart.length === 0 ? (
                     <div className="text-center py-8">
                       <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                       <p className="text-gray-500 text-base">No items in cart</p>
                       <p className="text-xs text-gray-400">Scan products or add them manually</p>
                     </div>
                   ) : (
                     <div className="space-y-1.5">
                       {cart.map((item) => (
                         <div key={item.id} className="cart-item">
                           <div className="flex items-center space-x-2">
                             {/* Product Image */}
                             <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                               <Package className="w-6 h-6 text-gray-400" />
                             </div>
                             
                             {/* Product Details */}
                             <div className="flex-1 min-w-0">
                               <h4 className="font-semibold text-gray-900 text-sm mb-0.5 truncate">{item.name}</h4>
                               <p className="text-gray-600 text-xs">₨{item.price.toFixed(2)}</p>
                             </div>
                             
                             {/* Edit Icon */}
                             <button className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex-shrink-0">
                               <Edit3 className="w-3 h-3" />
                             </button>
                             
                             {/* Quantity Controls */}
                             <div className="flex items-center space-x-1.5 flex-shrink-0">
                               <button
                                 onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                 className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                               >
                                 <Minus className="w-3 h-3 text-gray-600" />
                               </button>
                               <span className="text-sm font-semibold text-gray-900 w-6 text-center">
                                 {item.quantity}
                               </span>
                               <button
                                 onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                 className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                               >
                                 <Plus className="w-3 h-3 text-gray-600" />
                               </button>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                                 {/* Order Summary */}
                 <div className="cart-summary">
                   <div className="space-y-2 mb-3">
                     <div className="flex justify-between text-sm">
                       <span className="font-medium text-gray-700">Subtotal:</span>
                       <span className="font-semibold text-gray-900">₨{getSubtotal().toFixed(2)}</span>
                     </div>
                     
                     {/* Change Calculation */}
                     {showChange && (
                       <div className="flex justify-between text-sm">
                         <span className="font-medium text-gray-700">Change:</span>
                         <span className="font-semibold text-green-600">₨{getChange().toFixed(2)}</span>
                       </div>
                     )}
                     
                     <div className="border-t pt-2">
                       <div className="flex justify-between text-lg font-bold text-blue-600">
                         <span>Total:</span>
                         <span>₨{getTotal().toFixed(2)}</span>
                       </div>
                     </div>
                   </div>

                   {/* Customer Amount Input */}
                   <div className="mb-3">
                     <label className="block text-xs font-medium text-gray-700 mb-1.5">
                       Amount Received from Customer
                     </label>
                     <input
                       type="number"
                       step="0.01"
                       value={customerAmount}
                       onChange={(e) => handleCustomerAmountChange(e.target.value)}
                       placeholder="Enter amount received"
                       className="w-full py-2 px-3 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                     />
                   </div>

                   {/* Place Order Button */}
                   <button
                     onClick={handlePayment}
                     disabled={cart.length === 0}
                     className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold text-base hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg mb-3"
                   >
                     Place Order
                   </button>

                   {/* Payment Method */}
                   <div className="mb-3">
                     <label className="block text-xs font-medium text-gray-700 mb-1.5">
                       Payment Method
                     </label>
                     <div className="grid grid-cols-3 gap-1.5">
                       <button
                         onClick={() => setPaymentMethod('cash')}
                         className={`py-1.5 px-2 rounded border font-medium transition-colors text-xs ${
                           paymentMethod === 'cash' 
                             ? 'border-blue-500 bg-blue-50 text-blue-700' 
                             : 'border-gray-300 hover:border-gray-400'
                         }`}
                       >
                         <Banknote className="w-3 h-3 mr-1 inline" />
                         Cash
                       </button>
                       <button
                         onClick={() => setPaymentMethod('mobile')}
                         className={`py-1.5 px-2 rounded border font-medium transition-colors text-xs ${
                           paymentMethod === 'mobile' 
                             ? 'border-blue-500 bg-blue-50 text-blue-700' 
                             : 'border-gray-300 hover:border-gray-400'
                         }`}
                       >
                         <Smartphone className="w-3 h-3 mr-1 inline" />
                         Mobile
                       </button>
                       <button
                         onClick={() => setPaymentMethod('card')}
                         className={`py-1.5 px-2 rounded border font-medium transition-colors text-xs ${
                           paymentMethod === 'card' 
                             ? 'border-blue-500 bg-blue-50 text-blue-700' 
                             : 'border-gray-300 hover:border-gray-400'
                         }`}
                       >
                         <CreditCard className="w-3 h-3 mr-1 inline" />
                         Card
                       </button>
                     </div>
                   </div>
                 </div>
              </>
            ) : (
              // Inventory Mode - Product Form
              <div className="flex-1 overflow-y-auto p-6">
                {showProductForm ? (
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold mb-4">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </h3>
                      
                      <form onSubmit={handleProductSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name *
                          </label>
                          <input
                            type="text"
                            value={productForm.name}
                            onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                            className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Barcode *
                          </label>
                          <input
                            type="text"
                            value={productForm.barcode}
                            onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
                            className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Price (PKR) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={productForm.price}
                              onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Stock Quantity *
                            </label>
                            <input
                              type="number"
                              value={productForm.stock}
                              onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={productForm.description}
                            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                            rows="3"
                            className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div className="flex space-x-3 pt-4">
                          <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >
                            {editingProduct ? 'Update Product' : 'Add Product'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowProductForm(false);
                              setEditingProduct(null);
                              setProductForm({
                                name: '',
                                barcode: '',
                                price: '',
                                stock: '',
                                description: ''
                              });
                            }}
                            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : showCsvImport ? (
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold mb-4">Import Products from CSV</h3>
                      
                      {/* CSV Template Download */}
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h4>
                        <p className="text-sm text-blue-700 mb-3">
                          Your CSV should have headers: Name, Barcode, Price, Stock, Description
                        </p>
                        <button
                          onClick={downloadCsvTemplate}
                          className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                          Download CSV Template
                        </button>
                      </div>

                      {/* File Upload */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload CSV File
                        </label>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvFileUpload}
                          className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* CSV Preview */}
                      {csvData.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-3">
                            Preview ({csvData.length} products found)
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-200 rounded-lg">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                                    Name
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                                    Barcode
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                                    Price
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                                    Stock
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                                    Description
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {csvPreview.map((product, index) => (
                                  <tr key={index}>
                                    <td className="px-3 py-2 text-sm text-gray-900 border">{product.name}</td>
                                    <td className="px-3 py-2 text-sm text-gray-900 border">{product.barcode || 'N/A'}</td>
                                    <td className="px-3 py-2 text-sm text-gray-900 border">₨{product.price.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-gray-900 border">{product.stock}</td>
                                    <td className="px-3 py-2 text-sm text-gray-900 border">{product.description || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {csvData.length > 5 && (
                            <p className="text-sm text-gray-500 mt-2">
                              Showing first 5 rows. Total: {csvData.length} products
                            </p>
                          )}
                        </div>
                      )}

                      {/* Import Progress */}
                      {isImporting && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Importing products...</span>
                            <span className="text-sm text-gray-500">{Math.round(importProgress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${importProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        {csvData.length > 0 && !isImporting && (
                          <button
                            onClick={importCsvProducts}
                            className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >
                            Import {csvData.length} Products
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowCsvImport(false);
                            setCsvData([]);
                            setCsvPreview([]);
                          }}
                          className="bg-gray-100 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No product form open</p>
                    <p className="text-sm mt-1">Scan a barcode or click "Add New Product" to manage inventory</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default POS;
