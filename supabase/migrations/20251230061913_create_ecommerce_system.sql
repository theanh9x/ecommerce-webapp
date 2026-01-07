/*
  # E-Commerce Management System Schema

  ## Overview
  Complete e-commerce management system with inventory, sales, cash flow, and debt tracking for Vietnamese market.

  ## New Tables

  ### 1. profiles
  - `id` (uuid, FK to auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (text) - admin, manager, staff
  - `created_at` (timestamptz)

  ### 2. categories
  - `id` (uuid, PK)
  - `name` (text) - Category name
  - `description` (text)
  - `created_at` (timestamptz)

  ### 3. products
  - `id` (uuid, PK)
  - `name` (text) - Product name
  - `sku` (text) - Stock keeping unit
  - `category_id` (uuid, FK)
  - `description` (text)
  - `unit` (text) - Unit of measure (cái, hộp, kg, etc.)
  - `cost_price` (numeric) - Cost price in VND
  - `selling_price` (numeric) - Selling price in VND
  - `stock_quantity` (numeric) - Current stock
  - `min_stock_level` (numeric) - Minimum stock alert level
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. suppliers
  - `id` (uuid, PK)
  - `name` (text) - Supplier name
  - `contact_person` (text)
  - `phone` (text)
  - `email` (text)
  - `address` (text)
  - `debt_balance` (numeric) - Current debt to supplier in VND
  - `created_at` (timestamptz)

  ### 5. customers
  - `id` (uuid, PK)
  - `name` (text) - Customer name
  - `phone` (text)
  - `email` (text)
  - `address` (text)
  - `debt_balance` (numeric) - Current customer debt in VND
  - `created_at` (timestamptz)

  ### 6. purchase_orders
  - `id` (uuid, PK)
  - `order_number` (text) - Auto-generated order number
  - `supplier_id` (uuid, FK)
  - `order_date` (timestamptz)
  - `total_amount` (numeric) - Total in VND
  - `paid_amount` (numeric) - Amount paid in VND
  - `status` (text) - pending, completed, cancelled
  - `notes` (text)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)

  ### 7. purchase_order_items
  - `id` (uuid, PK)
  - `purchase_order_id` (uuid, FK)
  - `product_id` (uuid, FK)
  - `quantity` (numeric)
  - `unit_price` (numeric) - Price per unit in VND
  - `total_price` (numeric) - Quantity * unit_price

  ### 8. sales_orders
  - `id` (uuid, PK)
  - `order_number` (text) - Auto-generated order number
  - `customer_id` (uuid, FK)
  - `order_date` (timestamptz)
  - `total_amount` (numeric) - Total in VND
  - `paid_amount` (numeric) - Amount paid in VND
  - `discount` (numeric) - Discount in VND
  - `status` (text) - pending, completed, cancelled
  - `notes` (text)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)

  ### 9. sales_order_items
  - `id` (uuid, PK)
  - `sales_order_id` (uuid, FK)
  - `product_id` (uuid, FK)
  - `quantity` (numeric)
  - `unit_price` (numeric) - Selling price per unit in VND
  - `total_price` (numeric) - Quantity * unit_price

  ### 10. payments
  - `id` (uuid, PK)
  - `payment_type` (text) - purchase, sale
  - `reference_id` (uuid) - ID of purchase_order or sales_order
  - `amount` (numeric) - Amount in VND
  - `payment_method` (text) - cash, bank_transfer, card
  - `payment_date` (timestamptz)
  - `notes` (text)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)

  ### 11. cash_transactions
  - `id` (uuid, PK)
  - `transaction_type` (text) - income, expense
  - `category` (text) - sales, purchase, other
  - `amount` (numeric) - Amount in VND
  - `description` (text)
  - `transaction_date` (timestamptz)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies for role-based access (admin, manager, staff)
  - Admin: Full access
  - Manager: Read/write access to all operational tables
  - Staff: Read access to products, limited write access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  description text,
  unit text NOT NULL DEFAULT 'cái',
  cost_price numeric(15,2) NOT NULL DEFAULT 0,
  selling_price numeric(15,2) NOT NULL DEFAULT 0,
  stock_quantity numeric(15,2) NOT NULL DEFAULT 0,
  min_stock_level numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  debt_balance numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  debt_balance numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and managers can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date timestamptz NOT NULL DEFAULT now(),
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  paid_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity numeric(15,2) NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  total_price numeric(15,2) NOT NULL
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert purchase order items"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update purchase order items"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete purchase order items"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create sales_orders table
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_date timestamptz NOT NULL DEFAULT now(),
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  paid_amount numeric(15,2) NOT NULL DEFAULT 0,
  discount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read sales orders"
  ON sales_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales orders"
  ON sales_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and managers can update sales orders"
  ON sales_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete sales orders"
  ON sales_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create sales_order_items table
CREATE TABLE IF NOT EXISTS sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity numeric(15,2) NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  total_price numeric(15,2) NOT NULL
);

ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read sales order items"
  ON sales_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales order items"
  ON sales_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and managers can update sales order items"
  ON sales_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete sales order items"
  ON sales_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type text NOT NULL CHECK (payment_type IN ('purchase', 'sale')),
  reference_id uuid NOT NULL,
  amount numeric(15,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'card')),
  payment_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create cash_transactions table
CREATE TABLE IF NOT EXISTS cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric(15,2) NOT NULL,
  description text,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read cash transactions"
  ON cash_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert cash transactions"
  ON cash_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update cash transactions"
  ON cash_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete cash transactions"
  ON cash_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product ON sales_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);