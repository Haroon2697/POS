import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  Banknote, 
  QrCode, 
  X,
  Search,
  Plus,
  Minus
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BrowserMultiFormatReader } from '@zxing/browser';

function POS() {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerEmail, setCustomerEmail] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const videoRef = useRef(null);

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
    setDiscountAmount(0);
    setCustomerEmail('');
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTotal = () => {
    return getSubtotal() - discountAmount;
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

    try {
      const transactionData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        })),
        payment_method: paymentMethod,
        customer_email: customerEmail || null,
        discount_amount: discountAmount
      };

      const response = await axios.post('/api/transactions', transactionData);
      
      // Print receipt
      try {
        await axios.post('/api/print-receipt', {
          transaction_id: response.data.transaction_id
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

  const startScanning = () => {
    setScanning(true);
  };

  const stopScanning = () => {
    setScanning(false);
    if (scanner) {
      try {
        scanner.reset();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  useEffect(() => {
    let codeReader = null;
    
    if (scanning && videoRef.current) {
      try {
        codeReader = new BrowserMultiFormatReader();
        setScanner(codeReader);

        codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
          if (result) {
            const barcode = result.text;
            const product = products.find(p => p.barcode === barcode);
            
            if (product) {
              toast.success(`Scanned: ${product.name}`);
              addToCart(product);
              stopScanning();
            } else {
              toast.error('Product not found');
              stopScanning();
            }
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
  }, [scanning, addToCart, products]);

  const handleManualScan = (barcode) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      toast.success(`Scanned: ${product.name}`);
      addToCart(product);
      setManualBarcode(''); // Clear the input field after scanning
    } else {
      toast.error('Product not found');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.includes(searchTerm));
    return matchesSearch;
  });

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Side - Products and Cart */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
              <p className="text-gray-600">Cashier: {user?.username}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={scanning ? stopScanning : startScanning}
                className={`btn ${scanning ? 'btn-danger' : 'btn-primary'}`}
              >
                <QrCode className="w-4 h-4 mr-2" />
                {scanning ? 'Stop Scanning' : 'Scan Barcode'}
              </button>
              <button
                onClick={clearCart}
                className="btn btn-secondary"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Products Section - Smaller */}
          <div className="w-1/3 bg-white border-r overflow-y-auto">
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Manual Barcode Input */}
              <div className="mb-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Enter barcode manually"
                    className="flex-1 py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleManualScan(manualBarcode);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleManualScan(manualBarcode)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:ring-2 focus:ring-primary-500"
                  >
                    Scan
                  </button>
                </div>
              </div>

              {/* Barcode Scanner */}
              {scanning && (
                <div className="mb-4 p-4 border border-gray-300 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Barcode Scanner</h3>
                    <button
                      onClick={stopScanning}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <video
                    ref={videoRef}
                    className="w-full h-32 object-cover rounded border"
                  />
                </div>
              )}

              {/* Products Grid - Compact */}
              <div className="grid grid-cols-1 gap-3">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {product.name}
                    </div>
                    <div className="text-lg font-bold text-primary-600 mb-1">
                      ₨{product.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Stock: {product.stock}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart Section - Larger */}
          <div className="w-2/3 bg-white flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Shopping Cart</h2>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Cart is empty</p>
                  <p className="text-sm mt-1">Scan products or add them manually</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-lg mb-1">{item.name}</div>
                          <div className="text-lg text-primary-600 font-bold mb-2">
                            ₨{(item.price * item.quantity).toFixed(2)} total
                          </div>
                          <div className="text-sm text-gray-500">
                            ₨{item.price.toFixed(2)} each × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary */}
            <div className="border-t p-6 space-y-4 bg-gray-50">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction Summary</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-semibold">₨{getSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-base">
                  <span className="font-medium">Discount:</span>
                  <span className="font-semibold text-green-600">-₨{discountAmount.toFixed(2)}</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between text-xl font-bold text-primary-600">
                    <span>Total:</span>
                    <span>₨{getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Discount Input */}
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Apply Discount</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="flex-1 py-2 px-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setDiscountAmount(0)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 py-3 px-4 rounded-md border font-medium ${
                      paymentMethod === 'cash' 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Banknote className="w-5 h-5 mr-2 inline" />
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 py-3 px-4 rounded-md border font-medium ${
                      paymentMethod === 'card' 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mr-2 inline" />
                    Card
                  </button>
                </div>
              </div>

              {/* Customer Email */}
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email (Optional)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full py-2 px-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Complete Payment Button */}
              <div className="pt-4">
                <button
                  onClick={handlePayment}
                  disabled={cart.length === 0}
                  className="w-full btn btn-primary py-4 text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Payment - ₨{getTotal().toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default POS;
