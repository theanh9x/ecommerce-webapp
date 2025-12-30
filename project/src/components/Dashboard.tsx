import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, TrendingUp, Users, AlertTriangle, DollarSign, CreditCard } from 'lucide-react';

type Stats = {
  totalProducts: number;
  lowStockProducts: number;
  totalSales: number;
  totalPurchases: number;
  totalCustomers: number;
  totalSuppliers: number;
  customerDebts: number;
  supplierDebts: number;
  recentSales: any[];
  recentPurchases: any[];
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    lowStockProducts: 0,
    totalSales: 0,
    totalPurchases: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    customerDebts: 0,
    supplierDebts: 0,
    recentSales: [],
    recentPurchases: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [
        productsRes,
        lowStockRes,
        salesRes,
        purchasesRes,
        customersRes,
        suppliersRes,
        customerDebtsRes,
        supplierDebtsRes,
        recentSalesRes,
        recentPurchasesRes,
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).lt('stock_quantity', supabase.rpc('min_stock_level')),
        supabase.from('sales_orders').select('total_amount, paid_amount').eq('status', 'completed'),
        supabase.from('purchase_orders').select('total_amount, paid_amount').eq('status', 'completed'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('debt_balance'),
        supabase.from('suppliers').select('debt_balance'),
        supabase.from('sales_orders').select('order_number, order_date, total_amount, paid_amount, customers(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('purchase_orders').select('order_number, order_date, total_amount, paid_amount, suppliers(name)').order('created_at', { ascending: false }).limit(5),
      ]);

      const totalSales = salesRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const totalPurchases = purchasesRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const customerDebts = customerDebtsRes.data?.reduce((sum, customer) => sum + Number(customer.debt_balance), 0) || 0;
      const supplierDebts = supplierDebtsRes.data?.reduce((sum, supplier) => sum + Number(supplier.debt_balance), 0) || 0;

      setStats({
        totalProducts: productsRes.count || 0,
        lowStockProducts: lowStockRes.count || 0,
        totalSales,
        totalPurchases,
        totalCustomers: customersRes.count || 0,
        totalSuppliers: suppliersRes.count || 0,
        customerDebts,
        supplierDebts,
        recentSales: recentSalesRes.data || [],
        recentPurchases: recentPurchasesRes.data || [],
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (loading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Tổng quan</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng sản phẩm</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalProducts}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sắp hết hàng</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.lowStockProducts}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Khách hàng</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalCustomers}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Doanh thu</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(stats.totalSales)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <TrendingUp className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <CreditCard className="text-red-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Công nợ khách hàng</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.customerDebts)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <DollarSign className="text-yellow-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Công nợ nhà cung cấp</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{formatCurrency(stats.supplierDebts)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Đơn bán hàng gần đây</h3>
          <div className="space-y-3">
            {stats.recentSales.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Chưa có đơn hàng nào</p>
            ) : (
              stats.recentSales.map((sale: any) => (
                <div key={sale.order_number} className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div>
                    <p className="font-medium text-gray-800">{sale.order_number}</p>
                    <p className="text-sm text-gray-500">{sale.customers?.name || 'Khách lẻ'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{formatCurrency(sale.total_amount)}</p>
                    <p className="text-sm text-gray-500">Đã thu: {formatCurrency(sale.paid_amount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Đơn nhập hàng gần đây</h3>
          <div className="space-y-3">
            {stats.recentPurchases.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Chưa có đơn nhập hàng nào</p>
            ) : (
              stats.recentPurchases.map((purchase: any) => (
                <div key={purchase.order_number} className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div>
                    <p className="font-medium text-gray-800">{purchase.order_number}</p>
                    <p className="text-sm text-gray-500">{purchase.suppliers?.name || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{formatCurrency(purchase.total_amount)}</p>
                    <p className="text-sm text-gray-500">Đã trả: {formatCurrency(purchase.paid_amount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
