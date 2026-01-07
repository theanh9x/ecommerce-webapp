import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Supplier = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  unit: string;
  cost_price: number;
};

type PurchaseOrder = {
  id: string;
  order_number: string;
  order_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  suppliers?: { name: string };
};

type OrderItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export default function Purchases() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    paid_amount: 0,
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const { profile } = useAuth();

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadProducts();
  }, []);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false });

    if (!error) setOrders(data || []);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name').order('name');
    setSuppliers(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, unit, cost_price').order('name');
    setProducts(data || []);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].unit_price = product.cost_price;
      }
    }

    setOrderItems(updated);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    const orderNumber = `NH${Date.now()}`;
    const totalAmount = calculateTotal();

    const { data: orderData, error: orderError } = await supabase
      .from('purchase_orders')
      .insert([{
        order_number: orderNumber,
        supplier_id: formData.supplier_id,
        total_amount: totalAmount,
        paid_amount: formData.paid_amount,
        status: 'completed',
        notes: formData.notes,
        created_by: profile?.id,
      }])
      .select()
      .single();

    if (orderError) {
      alert('Lỗi tạo đơn nhập hàng: ' + orderError.message);
      return;
    }

    const items = orderItems.map(item => ({
      purchase_order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase.from('purchase_order_items').insert(items);

    if (itemsError) {
      alert('Lỗi thêm chi tiết đơn hàng: ' + itemsError.message);
      return;
    }

    for (const item of orderItems) {
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (product) {
        await supabase
          .from('products')
          .update({ stock_quantity: product.stock_quantity + item.quantity })
          .eq('id', item.product_id);
      }
    }

    if (formData.supplier_id) {
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('debt_balance')
        .eq('id', formData.supplier_id)
        .single();

      if (supplier) {
        const debtChange = totalAmount - formData.paid_amount;
        await supabase
          .from('suppliers')
          .update({ debt_balance: supplier.debt_balance + debtChange })
          .eq('id', formData.supplier_id);
      }
    }

    setShowModal(false);
    resetForm();
    loadOrders();
  };

  const resetForm = () => {
    setFormData({ supplier_id: '', paid_amount: 0, notes: '' });
    setOrderItems([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý nhập hàng</h2>
        {canEdit && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Tạo đơn nhập hàng
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã đơn</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nhà cung cấp</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ngày nhập</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tổng tiền</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Đã trả</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Còn nợ</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{order.order_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{order.suppliers?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(order.order_date).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(order.paid_amount)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                    {formatCurrency(order.total_amount - order.paid_amount)}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(order.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && (
            <p className="text-center text-gray-500 py-8">Chưa có đơn nhập hàng nào</p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Tạo đơn nhập hàng</h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nhà cung cấp</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số tiền đã trả (VND)</label>
                  <input
                    type="number"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Sản phẩm</label>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Thêm sản phẩm
                  </button>
                </div>

                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateOrderItem(index, 'product_id', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Chọn sản phẩm</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', Number(e.target.value))}
                        placeholder="Số lượng"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateOrderItem(index, 'unit_price', Number(e.target.value))}
                        placeholder="Đơn giá"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {orderItems.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Tổng cộng:</span>
                    <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              )}

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
                  Tạo đơn nhập hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
