import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Transaction = {
  id: string;
  transaction_type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  transaction_date: string;
};

export default function CashFlow() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'income' as 'income' | 'expense',
    category: 'sales',
    amount: 0,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });
  const { profile } = useAuth();

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (!error) setTransactions(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('cash_transactions').insert([{
      ...formData,
      created_by: profile?.id,
    }]);

    if (error) {
      alert('Lỗi thêm giao dịch: ' + error.message);
      return;
    }

    setShowModal(false);
    resetForm();
    loadTransactions();
  };

  const resetForm = () => {
    setFormData({
      transaction_type: 'income',
      category: 'sales',
      amount: 0,
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const calculateTotals = () => {
    const income = transactions
      .filter((t) => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter((t) => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense, balance: income - expense };
  };

  const totals = calculateTotals();

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      sales: 'Bán hàng',
      purchase: 'Nhập hàng',
      other: 'Khác',
      salary: 'Lương',
      rent: 'Thuê mặt bằng',
      utilities: 'Tiện ích',
      marketing: 'Marketing',
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý dòng tiền</h2>
        {canEdit && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Thêm giao dịch
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <p className="text-sm text-gray-600">Thu nhập</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="text-red-600" size={20} />
            </div>
            <p className="text-sm text-gray-600">Chi phí</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expense)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm text-gray-600">Số dư</p>
          </div>
          <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(totals.balance)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ngày</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Loại</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Danh mục</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mô tả</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(transaction.transaction_date).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.transaction_type === 'income'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transaction.transaction_type === 'income' ? 'Thu' : 'Chi'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {getCategoryLabel(transaction.category)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{transaction.description || '-'}</td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.transaction_type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {transactions.length === 0 && (
            <p className="text-center text-gray-500 py-8">Chưa có giao dịch nào</p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Thêm giao dịch mới</h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loại giao dịch</label>
                <select
                  value={formData.transaction_type}
                  onChange={(e) =>
                    setFormData({ ...formData, transaction_type: e.target.value as 'income' | 'expense' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="income">Thu nhập</option>
                  <option value="expense">Chi phí</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {formData.transaction_type === 'income' ? (
                    <>
                      <option value="sales">Bán hàng</option>
                      <option value="other">Khác</option>
                    </>
                  ) : (
                    <>
                      <option value="purchase">Nhập hàng</option>
                      <option value="salary">Lương</option>
                      <option value="rent">Thuê mặt bằng</option>
                      <option value="utilities">Tiện ích</option>
                      <option value="marketing">Marketing</option>
                      <option value="other">Khác</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Số tiền (VND)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày giao dịch</label>
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
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
                  Thêm giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
