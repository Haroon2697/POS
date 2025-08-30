import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, ShoppingCart, BarChart3, Download, FileText, Printer } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

function Reports() {
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const fetchSalesData = useCallback(async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await axios.get(`/api/reports/sales?start_date=${startDate}&end_date=${endDate}`);
      setSalesData(response.data);
    } catch (error) {
      toast.error('Failed to fetch sales data');
    }
  }, []);

  const fetchTopProducts = useCallback(async () => {
    try {
      const response = await axios.get('/api/reports/top-products');
      setTopProducts(response.data);
    } catch (error) {
      // Mock data for now
      setTopProducts([
        { name: 'Coca Cola 500ml', units_sold: 45, revenue: 675.00 },
        { name: 'White Bread', units_sold: 38, revenue: 190.00 },
        { name: 'Milk 1L', units_sold: 32, revenue: 160.00 },
        { name: 'Bananas 1kg', units_sold: 28, revenue: 84.00 },
        { name: 'Eggs 12pc', units_sold: 25, revenue: 125.00 }
      ]);
    }
  }, []);

  const fetchRecentTransactions = useCallback(async () => {
    try {
      const response = await axios.get('/api/reports/recent-transactions');
      setRecentTransactions(response.data);
    } catch (error) {
      // Mock data for now
      setRecentTransactions([
        { id: 'TXN-001', time: '10:30 AM', customer: 'John Doe', items: 5, payment: 'Cash', total: 45.75 },
        { id: 'TXN-002', time: '10:25 AM', customer: 'Walk-in', items: 3, payment: 'Card', total: 23.50 },
        { id: 'TXN-003', time: '10:20 AM', customer: 'Sarah Wilson', items: 8, payment: 'Cash', total: 67.25 },
        { id: 'TXN-004', time: '10:15 AM', customer: 'Walk-in', items: 2, payment: 'Card', total: 15.00 },
        { id: 'TXN-005', time: '10:10 AM', customer: 'Mike Johnson', items: 6, payment: 'Cash', total: 52.80 }
      ]);
    }
  }, []);

  useEffect(() => {
    fetchSalesData();
    fetchTopProducts();
    fetchRecentTransactions();
  }, [fetchSalesData, fetchTopProducts, fetchRecentTransactions]);

  const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);
  const totalTransactions = salesData.reduce((sum, day) => sum + day.transactions, 0);
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const profitMargin = 24.5; // Mock data for now

  // Mock daily sales trend data
  const dailySalesTrend = [
    { day: 'Mon, Jan 1', transactions: 142, revenue: 2847.50 },
    { day: 'Tue, Jan 2', transactions: 158, revenue: 3156.75 },
    { day: 'Wed, Jan 3', transactions: 147, revenue: 2934.25 },
    { day: 'Thu, Jan 4', transactions: 171, revenue: 3421.80 },
    { day: 'Fri, Jan 5', transactions: 138, revenue: 2756.90 }
  ];

  const exportToCSV = () => {
    toast.success('CSV export started');
  };

  const generatePDF = () => {
    toast.success('PDF generation started');
  };

  const printSummary = () => {
    toast.success('Printing summary...');
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-600 mt-1">Business insights and performance metrics</p>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Sales */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Sales</p>
              <h3 className="text-lg font-bold text-gray-900">₨{totalRevenue.toFixed(2)}</h3>
              <p className="text-xs text-green-600 font-medium">+15.2%</p>
            </div>
            <div className="p-2 bg-green-100 rounded-md">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Transactions</p>
              <h3 className="text-lg font-bold text-gray-900">{totalTransactions}</h3>
              <p className="text-xs text-green-600 font-medium">+8.1%</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-md">
              <ShoppingCart className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Avg Transaction */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Avg Transaction</p>
              <h3 className="text-lg font-bold text-gray-900">₨{averageTransaction.toFixed(2)}</h3>
              <p className="text-xs text-green-600 font-medium">+2.3%</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-md">
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Profit Margin</p>
              <h3 className="text-lg font-bold text-gray-900">{profitMargin}%</h3>
              <p className="text-xs text-green-600 font-medium">+1.2%</p>
            </div>
            <div className="p-2 bg-green-100 rounded-md">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Better Space Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Sales Trend - Left Column */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Daily Sales Trend</h3>
          <div className="space-y-2">
            {dailySalesTrend.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{day.day}</p>
                  <p className="text-xs text-gray-600">{day.transactions} txns</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₨{day.revenue.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products - Right Column */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Top Products</h3>
          <div className="space-y-2">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-32">{product.name}</p>
                    <p className="text-xs text-gray-600">{product.units_sold} units</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₨{product.revenue.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions - Full Width */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">{transaction.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{transaction.time}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 truncate max-w-20">{transaction.customer}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{transaction.items}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{transaction.payment}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">₨{transaction.total.toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    <button className="text-blue-600 hover:text-blue-800">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Actions - Compact */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Export Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            <Download className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-700">Export CSV</span>
          </button>
          
          <button
            onClick={generatePDF}
            className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-700">Generate PDF</span>
          </button>
          
          <button
            onClick={printSummary}
            className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            <Printer className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-700">Print Summary</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Reports;
