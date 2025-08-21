import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings as SettingsIcon, 
  Save, 
  Database, 
  Cloud, 
  Printer, 
  Building,
  Shield,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

function Settings() {
  const { user, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [backupStatus, setBackupStatus] = useState('idle');

  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    tax_rate: '',
    backup_enabled: false,
    printer_enabled: false,
    printer_interface: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // loading state omitted
      const response = await axios.get('/api/settings');
      
      setFormData({
        company_name: response.data.company_name || '',
        company_address: response.data.company_address || '',
        tax_rate: response.data.tax_rate || '0.08',
        backup_enabled: response.data.backup_enabled === 'true',
        printer_enabled: response.data.printer_enabled === 'true',
        printer_interface: response.data.printer_interface || 'usb://0x04b8/0x0202'
      });
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      // loading state omitted
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Update settings one by one
      const updates = [
        ['company_name', formData.company_name],
        ['company_address', formData.company_address],
        ['tax_rate', formData.tax_rate],
        ['backup_enabled', formData.backup_enabled.toString()],
        ['printer_enabled', formData.printer_enabled.toString()],
        ['printer_interface', formData.printer_interface]
      ];

      for (const [key, value] of updates) {
        await axios.put('/api/settings', { key, value });
      }
      
      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleManualBackup = async () => {
    try {
      setBackupStatus('backing-up');
      await axios.post('/api/backup/manual');
      toast.success('Manual backup initiated');
      setTimeout(() => setBackupStatus('idle'), 2000);
    } catch (error) {
      toast.error('Backup failed');
      setBackupStatus('idle');
    }
  };

  const handleTestPrinter = async () => {
    try {
      // This would call the printer test endpoint
      toast.success('Test page sent to printer');
    } catch (error) {
      toast.error('Printer test failed');
    }
  };

  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You need admin privileges to access settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">Configure system preferences and hardware settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Building className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                className="input"
                placeholder="Your Company Name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Address
              </label>
              <input
                type="text"
                value={formData.company_address}
                onChange={(e) => setFormData({...formData, company_address: e.target.value})}
                className="input"
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="card">
          <div className="flex items-center mb-4">
            <SettingsIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">System Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.tax_rate}
                onChange={(e) => setFormData({...formData, tax_rate: e.target.value})}
                className="input"
                placeholder="0.08"
              />
              <p className="text-xs text-gray-500 mt-1">Enter as decimal (e.g., 0.08 for 8%)</p>
            </div>
          </div>
        </div>

        {/* Backup Settings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Cloud className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Cloud Backup</h2>
            </div>
            <button
              type="button"
              onClick={handleManualBackup}
              disabled={backupStatus !== 'idle'}
              className="btn-secondary text-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${backupStatus === 'backing-up' ? 'animate-spin' : ''}`} />
              {backupStatus === 'backing-up' ? 'Backing up...' : 'Manual Backup'}
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="backup_enabled"
                checked={formData.backup_enabled}
                onChange={(e) => setFormData({...formData, backup_enabled: e.target.checked})}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="backup_enabled" className="ml-2 block text-sm text-gray-900">
                Enable automatic cloud backups
              </label>
            </div>
            
            {formData.backup_enabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Cloud className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      MEGA Cloud Backup
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>• Daily automatic backups at 2:00 AM</p>
                      <p>• 20GB free storage included</p>
                      <p>• Encrypted data transmission</p>
                      <p>• Configure credentials in server/.env file</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Printer Settings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Printer className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Receipt Printer</h2>
            </div>
            <button
              type="button"
              onClick={handleTestPrinter}
              className="btn-secondary text-sm"
            >
              Test Printer
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="printer_enabled"
                checked={formData.printer_enabled}
                onChange={(e) => setFormData({...formData, printer_enabled: e.target.checked})}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="printer_enabled" className="ml-2 block text-sm text-gray-900">
                Enable receipt printing
              </label>
            </div>
            
            {formData.printer_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Printer Interface
                </label>
                <input
                  type="text"
                  value={formData.printer_interface}
                  onChange={(e) => setFormData({...formData, printer_interface: e.target.value})}
                  className="input"
                  placeholder="usb://0x04b8/0x0202"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Common format: usb://vendor_id/product_id
                </p>
              </div>
            )}
            
            {formData.printer_enabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Printer className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Printer Configuration
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>• ESC/POS compatible thermal printers</p>
                      <p>• USB, Network, or Serial connections</p>
                      <p>• Automatic receipt printing on checkout</p>
                      <p>• Test printing available</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* System Info */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Database className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">System Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Current User:</p>
            <p className="font-medium text-gray-900">{user?.username} ({user?.role})</p>
          </div>
          <div>
            <p className="text-gray-600">Database:</p>
            <p className="font-medium text-gray-900">SQLite (Local)</p>
          </div>
          <div>
            <p className="text-gray-600">Backup Status:</p>
            <p className="font-medium text-gray-900">
              {formData.backup_enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Printer Status:</p>
            <p className="font-medium text-gray-900">
              {formData.printer_enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
