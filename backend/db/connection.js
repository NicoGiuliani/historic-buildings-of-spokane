import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.DATABASE,
  connectionLimit: 10,
});

pool.getConnection((err, con) => {
  if (err) {
    console.log('Could not connect');
  } else {
    console.log('Successfully connected to the database');
  }
});

export default pool;
