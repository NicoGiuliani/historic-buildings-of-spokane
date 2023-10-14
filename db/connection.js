import dotenv from 'dotenv';
import pg from "pg";
dotenv.config();

const Pool = pg.Pool

const pool = new Pool({
  user: "postgres",
  host: "containers-us-west-59.railway.app",
  database: "railway",
  password: "yFqoJixp3Zpbfs2ekzRM",
  port: 8067,
});

export default pool;
