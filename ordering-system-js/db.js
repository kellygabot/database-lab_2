const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'leafgym-db.clquq84mqr8o.eu-north-1.rds.amazonaws.com',
  user: 'admin',
  password: 'Kwg7iPfiNbV7PN5',
  database: 'ordering_system_db'
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

module.exports = connection;