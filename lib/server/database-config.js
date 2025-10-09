/**
 * 数据库配置和切换
 * 可以选择使用 Memos 数据库或原有的简单数据库
 */

import { getMemosDatabase } from './memos-database.js';
import { getDatabase as getSimpleDatabase } from './database-simple.js';

// 数据库类型配置
// 可以通过环境变量或直接修改这里来切换数据库
const DB_TYPE = process.env.DB_TYPE || 'memos'; // 'memos' 或 'simple'

/**
 * 获取当前配置的数据库实例
 */
export function getDatabase() {
  if (DB_TYPE === 'memos') {
    return getMemosDatabase();
  } else {
    return getSimpleDatabase();
  }
}

/**
 * 获取数据库类型
 */
export function getDatabaseType() {
  return DB_TYPE;
}

/**
 * 检查是否使用 Memos 数据库
 */
export function isUsingMemosDb() {
  return DB_TYPE === 'memos';
}

export default getDatabase;

