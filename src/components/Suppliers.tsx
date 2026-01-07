import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Supplier = {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  debt_balance: number;
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });
  const { profile } = useAuth();

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setSuppliers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSupplier) {
      const { error } = await supabase
        .from('suppliers')
        .update(formData)
        .eq('id', editingSupplier.id);

      if (error) {
        alert('Lỗi cập nhật nhà cung cấp: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('suppliers').insert([formData]);

      if (error) {
        alert('Lỗi thêm nhà cung cấp: ' + error.message);
        return;
      }
    }

    setShowModal(false);
    setEditingSupplier(null);
    resetForm();
    loadSuppliers();
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa nhà cung cấp này?')) return;

    const { error } = await supabase.from('suppliers').delete().eq('id', id);

    if (error) {
      alert('Lỗi xóa nhà cung cấp: ' + error.message);
    } else {
      loadSuppliers();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý nhà cung cấp</h2>
        {canEdit && (
          <button
            onClick={() => {
              setEditingSupplier(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Thêm nhà cung cấp
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Tổng nhà cung cấp</p>
          <p className="text-2xl font-bold text-gray-800">{suppliers.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Tổng công nợ</p>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(suppliers.reduce((sum, s) => sum + s.debt_balance, 0))}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên công ty</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Người liên hệ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Số điện thoại</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Công nợ</th>
                {canEdit && <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{supplier.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{supplier.contact_person || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{supplier.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{supplier.email || '-'}</td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${supplier.debt_balance > 0 ? 'text-yellow-600' : 'text-gray-700'}`}>
                    {formatCurrency(supplier.debt_balance)}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(supplier.id)}
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

          {suppliers.length === 0 && (
            <p className="text-center text-gray-500 py-8">Chưa có nhà cung cấp nào</p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                {editingSupplier ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp mới'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên công ty</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Người liên hệ</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    setEditingSupplier(null);
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
                  {editingSupplier ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
