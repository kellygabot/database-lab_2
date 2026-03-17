const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/products', (req, res) => {
  db.query('SELECT * FROM products WHERE stock > 0', (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

app.post('/order', (req, res) => {
  const { full_name, email, phone, address, items } = req.body;

  const customerSql = `
    INSERT INTO customers (full_name, email, phone, address)
    VALUES (?, ?, ?, ?)
  `;

  db.query(customerSql, [full_name, email, phone, address], (err, customerResult) => {
    if (err) return res.status(500).json(err);

    const customerId = customerResult.insertId;
    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += item.quantity * item.price;
    });

    const orderSql = `
      INSERT INTO orders (customer_id, total_amount, order_status)
      VALUES (?, ?, 'Pending')
    `;

    db.query(orderSql, [customerId, totalAmount], (err, orderResult) => {
      if (err) return res.status(500).json(err);

      const orderId = orderResult.insertId;

      items.forEach(item => {
        const subtotal = item.quantity * item.price;
        db.query(
          `INSERT INTO order_items (order_id, product_id, quantity, subtotal) VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, subtotal]
        );
        db.query(
          `UPDATE products SET stock = stock - ? WHERE product_id = ?`,
          [item.quantity, item.product_id]
        );
      });

      res.json({
        message: 'Order saved successfully',
        order_id: orderId,
        total_amount: totalAmount
      });
    });
  });
});

// --- Best sellers: top products by total quantity sold ---
app.get('/stats/bestsellers', (req, res) => {
  const sql = `
    SELECT
      p.product_id,
      p.product_name,
      p.price,
      SUM(oi.quantity)              AS total_sold,
      SUM(oi.subtotal)              AS total_revenue,
      COUNT(DISTINCT oi.order_id)   AS order_count
    FROM order_items oi
    JOIN products p ON p.product_id = oi.product_id
    GROUP BY p.product_id, p.product_name, p.price
    ORDER BY total_sold DESC
    LIMIT 10
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// --- Pairings: products most commonly ordered together ---
app.get('/stats/pairings', (req, res) => {
  const sql = `
    SELECT
      p1.product_name  AS product_a,
      p2.product_name  AS product_b,
      COUNT(*)         AS pair_count
    FROM order_items a
    JOIN order_items b  ON a.order_id = b.order_id AND a.product_id < b.product_id
    JOIN products p1    ON p1.product_id = a.product_id
    JOIN products p2    ON p2.product_id = b.product_id
    GROUP BY a.product_id, b.product_id, p1.product_name, p2.product_name
    ORDER BY pair_count DESC
    LIMIT 10
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// --- Overview stats: total orders, revenue, customers ---
app.get('/stats/overview', (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM orders)                         AS total_orders,
      (SELECT COALESCE(SUM(total_amount),0) FROM orders)   AS total_revenue,
      (SELECT COUNT(*) FROM customers)                      AS total_customers,
      (SELECT COUNT(*) FROM orders WHERE order_status = 'Completed') AS completed_orders
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});