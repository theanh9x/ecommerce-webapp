import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Truck } from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  phone: string;
  debt_balance: number;
};

type Supplier = {
  id: string;
  name: string;
  phone: string;
  debt_balance: number;
};

export default function Debts() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    const { data: customersData } = await supabase
      .from('customers')
      .select('id, name, phone, debt_balance')
      .gt('debt_balance', 0)
      .order('debt_balance', { ascending: false });

    const { data: suppliersData } = await supabase
      .from('suppliers')
      .select('id, name, phone, debt_balance')
      .gt('debt_balance', 0)
      .order('debt_balance', { ascending: false });

    setCustomers(customersData || []);
    setSuppliers(suppliersData || []);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const totalCustomerDebt = customers.reduce((sum, c) => sum + c.debt_balance, 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + s.debt_balance, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Quản lý công nợ</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <Users className="text-red-600" size={20} />
            </div>
            <p className="text-sm text-gray-600">Tổng nợ khách hàng</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCustomerDebt)}</p>
          <p className="text-sm text-gray-500 mt-1">{customers.length} khách hàng nợ</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Truck className="text-yellow-600" size={20} />
            </div>
            <p className="text-sm text-gray-600">Tổng nợ nhà cung cấp</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalSupplierDebt)}</p>
          <p className="text-sm text-gray-500 mt-1">{suppliers.length} nhà cung cấp nợ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={20} />
            Công nợ khách hàng
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Khách hàng</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SĐT</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Số nợ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{customer.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{customer.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      {formatCurrency(customer.debt_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {customers.length === 0 && (
              <p className="text-center text-gray-500 py-8">Không có khách hàng nợ</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Truck size={20} />
            Công nợ nhà cung cấp
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nhà cung cấp</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SĐT</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Số nợ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{supplier.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{supplier.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-yellow-600">
                      {formatCurrency(supplier.debt_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {suppliers.length === 0 && (
              <p className="text-center text-gray-500 py-8">Không có nhà cung cấp nợ</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
