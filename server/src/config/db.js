import { Sequelize, Op } from 'sequelize';
import fs from 'fs';
import path from 'path';

const url = process.env.DATABASE_URL;

function createSequelize() {
  if (url) {
    return new Sequelize(url, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: process.env.DB_SSL === 'false' ? {} : { ssl: { require: true, rejectUnauthorized: false } },
    });
  }
  const storage = process.env.SQLITE_PATH || path.resolve('data', 'isip.sqlite');
  fs.mkdirSync(path.dirname(storage), { recursive: true });
  return new Sequelize({ dialect: 'sqlite', storage, logging: false });
}

export const sequelize = createSequelize();

// Case-insensitive LIKE on PostgreSQL, plain LIKE on SQLite (already case-insensitive for ASCII).
export const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
