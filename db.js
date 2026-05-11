import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./shared/schema.js";

const pool = mysql.createPool({
  host: "loclhost",
  user: "root",
  password: "",
  database: "leafdoctor",
  port: 3306,
});

const db = drizzle(pool, { schema, mode: "default" });

export { db, pool };
