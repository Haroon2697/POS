import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

function Reports() {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // 7, 30, 90 days

  const fetchSalesData = useCallback(async () => {
    try {
      setLoading(true);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await axios.get(`/api/reports/sales?start_date=${startDate}&end_date=${endDate}`);
      setSalesData(response.data);
    } catch (error) {
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);
  const totalTransactions = salesData.reduce((sum, day) => sum + day.transactions, 0);
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
        <p className="text-gray-600">View sales performance and analytics</p>
      </div>

      {/* Date Range Selector */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input w-32"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <button
            onClick={fetchSalesData}
            className="btn-secondary"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalTransactions}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Transaction</p>
              <p className="text-2xl font-bold text-gray-900">
                ${averageTransaction.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Daily Sales</h2>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="flex-1 bg-gray-200 rounded h-8"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {salesData.map((day) => (
              <div key={day.date} className="flex items-center space-x-4">
                <div className="w-20 text-sm text-gray-600">
                  {new Date(day.date).toLocaleDateString()}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-8 relative">
                    <div 
                      className="bg-primary-600 h-8 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((day.revenue / Math.max(...salesData.map(d => d.revenue))) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-16 text-right text-sm font-medium text-gray-900">
                  ${day.revenue.toFixed(2)}
                </div>
                <div className="w-16 text-right text-sm text-gray-500">
                  {day.transactions} sales
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Table */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Detailed Sales Data</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesData.map((day) => (
                <tr key={day.date} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(day.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {day.transactions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${day.revenue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${day.avg_transaction.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Reports;
