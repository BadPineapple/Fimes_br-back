const mysql = require('mysql2/promise'); // Usamos /promise para usar async/await
require('dotenv').config();

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Padrão do XAMPP
    password: '',     // Padrão do XAMPP é vazio
    database: 'api_filmes',
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;