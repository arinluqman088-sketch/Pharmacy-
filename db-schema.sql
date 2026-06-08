-- AR Pharmacy POS database schema
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL, name TEXT);
CREATE TABLE medicines (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, barcode TEXT, name TEXT NOT NULL, scientific_name TEXT, category TEXT, company TEXT, unit TEXT, sell_price REAL, buy_price REAL, min_stock INTEGER, requires_prescription INTEGER);
CREATE TABLE medicine_batches (id INTEGER PRIMARY KEY AUTOINCREMENT, medicine_id INTEGER NOT NULL, batch_no TEXT, expiry_date DATE, quantity INTEGER, buy_price REAL, sell_price REAL);
CREATE TABLE suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, address TEXT, note TEXT);
CREATE TABLE customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, address TEXT);
CREATE TABLE purchases (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER, invoice_no TEXT, purchase_date DATETIME, subtotal REAL, discount REAL, total REAL, paid REAL, debt REAL, note TEXT);
CREATE TABLE sales (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, user_id INTEGER, sale_date DATETIME, subtotal REAL, discount REAL, total REAL, paid REAL, change_amount REAL, payment_type TEXT, profit REAL, note TEXT);
CREATE TABLE sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER, medicine_id INTEGER, batch_id INTEGER, quantity INTEGER, sell_price REAL, buy_price REAL, total REAL);
CREATE TABLE prescriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, doctor_name TEXT, prescription_no TEXT, image_url TEXT, note TEXT, created_at DATETIME);
CREATE TABLE expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, amount REAL, expense_date DATETIME, note TEXT);
