import { Database } from "sqlite";

const db = new Database("microblog.sqlite3");
db.exec("pragma journal_mode = WAL");
db.exec("pragma foreign_keys = ON");

export default db;
