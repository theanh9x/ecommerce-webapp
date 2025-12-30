import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Customer = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  unit: string;
  selling_price: number;
  stock_quantity: number;
};

type SalesOrder = {
  id: string;
  order_number: string;
  order_date: string;
  total_amount: number;
  paid_amount: number;
  discount: number;
  status: string;
  customers?: { name: string };
};

type OrderItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export default function Sales() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    paid_amount: 0,
    discount: 0,
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    loadOrders();
    loadCustomers();
    loadProducts();
  }, []);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*, customers(name)')
      .order('created_at', { ascending: false });

    if (!error) setOrders(data || []);
  };

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name').order('name');
    setCustomers(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, unit, selling_price, stock_quantity').order('name');
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
        updated[index].unit_price = product.selling_price;
      }
    }

    setOrderItems(updated);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - formData.discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    for (const item of orderItems) {
      const product = products.find(p => p.id === item.product_id);
      if (product && product.stock_quantity < item.quantity) {
        alert(`Không đủ hàng tồn kho cho sản phẩm ${product.name}`);
        return;
      }
    }

    const orderNumber = `BH${Date.now()}`;
    const totalAmount = calculateTotal();

    const { data: orderData, error: orderError } = await supabase
      .from('sales_orders')
      .insert([{
        order_number: orderNumber,
        customer_id: formData.customer_id || null,
        total_amount: totalAmount,
        paid_amount: formData.paid_amount,
        discount: formData.discount,
        status: 'completed',
        notes: formData.notes,
        created_by: profile?.id,
      }])
      .select()
      .single();

    if (orderError) {
      alert('Lỗi tạo đơn bán hàng: ' + orderError.message);
      return;
    }

    const items = orderItems.map(item => ({
      sales_order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase.from('sales_order_items').insert(items);

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
          .update({ stock_quantity: product.stock_quantity - item.quantity })
          .eq('id', item.product_id);
      }
    }

    if (formData.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('debt_balance')
        .eq('id', formData.customer_id)
        .single();

      if (customer) {
        const debtChange = totalAmount - formData.paid_amount;
        await supabase
          .from('customers')
          .update({ debt_balance: customer.debt_balance + debtChange })
          .eq('id', formData.customer_id);
      }
    }

    setShowModal(false);
    resetForm();
    loadOrders();
  };

  const resetForm = () => {
    setFormData({ customer_id: '', paid_amount: 0, discount: 0, notes: '' });
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
        <h2 className="text-2xl font-bold text-gray-800">Quản lý bán hàng</h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Tạo đơn bán hàng
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã đơn</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Khách hàng</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ngày bán</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tổng tiền</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Đã thu</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Còn nợ</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{order.order_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{order.customers?.name || 'Khách lẻ'}</td>
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
            <p className="text-center text-gray-500 py-8">Chưa có đơn bán hàng nào</p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Tạo đơn bán hàng</h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Khách hàng</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Khách lẻ</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giảm giá (VND)</label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số tiền đã thu (VND)</label>
                  <input
                    type="number"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Sản phẩm</label>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    + Thêm sản phẩm
                  </button>
                </div>

                <div className="space-y-3">
                  {orderItems.map((item, index) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateOrderItem(index, 'product_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            required
                          >
                            <option value="">Chọn sản phẩm</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.unit}) - Tồn: {p.stock_quantity}
                              </option>
                            ))}
                          </select>
                          {product && item.quantity > product.stock_quantity && (
                            <p className="text-xs text-red-600 mt-1">Không đủ hàng tồn kho</p>
                          )}
                        </div>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', Number(e.target.value))}
                          placeholder="Số lượng"
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                          min="0.01"
                          step="0.01"
                        />
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateOrderItem(index, 'unit_price', Number(e.target.value))}
                          placeholder="Đơn giá"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    );
                  })}
                </div>
              </div>

              {orderItems.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Tạm tính:</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Giảm giá:</span>
                    <span>-{formatCurrency(formData.discount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
                    <span>Tổng cộng:</span>
                    <span className="text-green-600">{formatCurrency(calculateTotal())}</span>
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
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Tạo đơn bán hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
