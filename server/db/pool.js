const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config("../config.env");

const db = new Pool({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "expense_tracker_db",
  password: process.env.PGPASSWORD || "admin",
  port: process.env.PGPORT || 5432,
});

module.exports = db;
