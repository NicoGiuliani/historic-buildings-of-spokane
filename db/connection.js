import pg from "pg";
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const Pool = pg.Pool

const sslConfig = { 
  rejectUnauthorized: false,
  ca: fs.readFileSync(process.env.CERTAUTH),
}

console.log(process.env.PGUSER)

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: sslConfig
});

export default pool;
