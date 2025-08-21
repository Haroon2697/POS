import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShoppingCart, 
  Search, 
  QrCode, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  DollarSign,
  Receipt,
  X,
  Package
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BrowserMultiFormatReader } from '@zxing/browser';

function POS() {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const controlsRef = useRef(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerEmail, setCustomerEmail] = useState('');
  const [taxRate] = useState(0.08);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');

  const normalizeBarcode = (value) => String(value ?? '').replace(/\s+/g, '').trim();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      const nextQty = Math.min(existingItem.quantity + 1, product.stock);
      if (nextQty === existingItem.quantity) {
        toast.error('No more stock available for this item');
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: nextQty } : item));
    } else {
      if (product.stock <= 0) {
        toast.error('Item is out of stock');
        return;
      }
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => {
      if (item.id !== productId) return item;
      const capped = Math.min(newQuantity, item.stock);
      if (capped < newQuantity) {
        toast.error(`Only ${item.stock} in stock`);
      }
      return { ...item, quantity: capped };
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // scan handling is inlined in the ZXing callback to avoid hook deps warnings

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm)
      );
      if (filtered.length === 0) {
        toast.error('No products found');
      }
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Initialize scanner when toggled on
    if (!scanning) {
      try {
        controlsRef.current?.stop?.();
      } catch {}
      return;
    }

    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        const videoElement = document.getElementById('pos-barcode-video');
        if (!videoElement) return;
        
        // Prefer an environment/back camera when available
        let controls;
        try {
          controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: 'environment' } } },
            videoElement,
            (result, err) => {
              if (result) {
                const code = normalizeBarcode(result.getText());
                const product = products.find(p => normalizeBarcode(p.barcode) === code);
                if (product) {
                  addToCart(product);
                  setScanning(false);
                  toast.success(`Scanned: ${product.name}`);
                } else {
                  toast.error('Product not found');
                  setScanning(false);
                }
              }
            }
          );
        } catch (_) {}

        // Fallback to default device
        if (!controls) {
          try {
            controls = await reader.decodeFromVideoDevice(undefined, videoElement, (result, err) => {
              if (result) {
                const code = normalizeBarcode(result.getText());
                const product = products.find(p => normalizeBarcode(p.barcode) === code);
                if (product) {
                  addToCart(product);
                  setScanning(false);
                  toast.success(`Scanned: ${product.name}`);
                } else {
                  toast.error('Product not found');
                  setScanning(false);
                }
              }
            });
          } catch (_) {}
        }

        // Fallback to first enumerated camera if still no controls
        if (!controls) {
          const devices = await BrowserMultiFormatReader.listVideoInputDevices();
          const deviceId = devices?.[0]?.deviceId;
          if (!deviceId) {
            toast.error('No camera found on this device');
            return;
          }
          controls = await reader.decodeFromVideoDevice(deviceId, videoElement, (result, err) => {
            if (result) {
              const code = normalizeBarcode(result.getText());
              const product = products.find(p => normalizeBarcode(p.barcode) === code);
              if (product) {
                addToCart(product);
                setScanning(false);
                toast.success(`Scanned: ${product.name}`);
              } else {
                toast.error('Product not found');
                setScanning(false);
              }
            }
          });
        }
        controlsRef.current = controls;
      } catch (err) {
        toast.error('Failed to start camera. You can use manual barcode input.');
      }
    })();

    return () => {
      try {
        controlsRef.current?.stop?.();
      } catch {}
    };
  }, [scanning]);

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTaxAmount = () => {
    return getSubtotal() * taxRate;
  };

  const getTotal = () => {
    return getSubtotal() + getTaxAmount() - discountAmount;
  };

  const submitManualBarcode = (e) => {
    e.preventDefault();
    const code = normalizeBarcode(barcodeInput);
    if (!code) return;
    const product = products.find(p => normalizeBarcode(p.barcode) === code);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      toast.error('Product not found for this barcode');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const transactionData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        })),
        payment_method: paymentMethod,
        customer_email: customerEmail || null,
        tax_amount: getTaxAmount(),
        discount_amount: discountAmount
      };

      const response = await axios.post('/api/transactions', transactionData);
      
      // Print receipt (if printer is configured)
      try {
        await axios.post('/api/print-receipt', {
          id: response.data.transaction_id,
          items: cart,
          total: getTotal(),
          tax_amount: getTaxAmount(),
          discount_amount: discountAmount,
          payment_method: paymentMethod,
          customer_email: customerEmail,
          created_at: new Date().toISOString(),
          cashier_name: user.username
        });
      } catch (printError) {
        console.log('Receipt printing not available');
      }

      toast.success(`Transaction completed! ID: ${response.data.transaction_id}`);
      
      // Reset cart and form
      setCart([]);
      setShowCheckout(false);
      setCustomerEmail('');
      setDiscountAmount(0);
      
      // Refresh products to update stock
      fetchProducts();
    } catch (error) {
      toast.error('Checkout failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.includes(searchTerm)
  );

  return (
    <div className="pos-grid">
      {/* Main POS Area */}
      <div className="pos-main">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setScanning(!scanning)}
                className={`btn ${scanning ? 'btn-danger' : 'btn-primary'}`}
              >
                <QrCode className="h-5 w-5 mr-2" />
                {scanning ? 'Stop Scan' : 'Scan Barcode'}
              </button>
            </div>
          </div>

          {/* Scanner */}
          {scanning && (
            <div className="mb-6 scanner-container">
              <video id="pos-barcode-video" width="400" height="300" className="rounded-lg bg-black" muted playsInline />
              <div className="scanner-overlay">
                <div className="text-center">
                  <QrCode className="h-16 w-16 mx-auto mb-4" />
                  <p>Position barcode in view</p>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name or barcode..."
                  className="input pl-10 text-lg"
                />
              </div>
            </form>
            <form onSubmit={submitManualBarcode}>
              <div className="flex">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Enter barcode manually"
                  className="input flex-1 mr-2"
                />
                <button type="submit" className="btn-primary">Add</button>
              </div>
            </form>
          </div>

          {/* Products Grid */}
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => addToCart(product)}
              >
                <div className="text-center">
                  <div className="h-20 w-20 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <Package className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 text-sm mb-1 truncate">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold text-primary-600">
                    ${product.price.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Stock: {product.stock}
                  </p>
                  {product.barcode && (
                    <p className="text-xs text-gray-400 mt-1">
                      {product.barcode}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="pos-sidebar">
        <div className="card h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
            <ShoppingCart className="h-6 w-6 text-primary-600" />
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-6">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Cart is empty</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="cart-item bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm truncate">
                      {item.name}
                    </h3>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(Number(e.target.value) || 1, item.stock));
                          updateQuantity(item.id, val);
                        }}
                        className="w-16 text-center border border-gray-300 rounded-md py-1"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({taxRate * 100}%):</span>
                <span>${getTaxAmount().toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${getTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Checkout Button */}
          {cart.length > 0 && (
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full btn-success text-lg py-3 mt-4"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Checkout
            </button>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Complete Checkout</h3>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex-1 py-2 px-3 rounded-md border ${
                          paymentMethod === 'cash'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`flex-1 py-2 px-3 rounded-md border ${
                          paymentMethod === 'card'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Card
                      </button>
                    </div>
                  </div>

                  {/* Customer Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="input"
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Amount
                    </label>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={getSubtotal()}
                      className="input"
                    />
                  </div>

                  {/* Final Total */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-primary-600">
                        ${getTotal().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full btn-success sm:ml-3 sm:w-auto"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4 mr-2" />
                      Complete Sale
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="mt-3 w-full btn-secondary sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POS;
