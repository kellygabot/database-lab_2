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

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});