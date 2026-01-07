import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  debt_balance: number;
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const { profile } = useAuth();

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setCustomers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCustomer) {
      const { error } = await supabase
        .from('customers')
        .update(formData)
        .eq('id', editingCustomer.id);

      if (error) {
        alert('Lỗi cập nhật khách hàng: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('customers').insert([formData]);

      if (error) {
        alert('Lỗi thêm khách hàng: ' + error.message);
        return;
      }
    }

    setShowModal(false);
    setEditingCustomer(null);
    resetForm();
    loadCustomers();
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;

    const { error } = await supabase.from('customers').delete().eq('id', id);

    if (error) {
      alert('Lỗi xóa khách hàng: ' + error.message);
    } else {
      loadCustomers();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý khách hàng</h2>
        <button
          onClick={() => {
            setEditingCustomer(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Thêm khách hàng
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Tổng khách hàng</p>
          <p className="text-2xl font-bold text-gray-800">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Tổng công nợ</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(customers.reduce((sum, c) => sum + c.debt_balance, 0))}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên khách hàng</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Số điện thoại</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Địa chỉ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Công nợ</th>
                {canEdit && <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{customer.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{customer.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{customer.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{customer.address || '-'}</td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${customer.debt_balance > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {formatCurrency(customer.debt_balance)}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {customers.length === 0 && (
            <p className="text-center text-gray-500 py-8">Chưa có khách hàng nào</p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                {editingCustomer ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên khách hàng</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCustomer(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingCustomer ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
