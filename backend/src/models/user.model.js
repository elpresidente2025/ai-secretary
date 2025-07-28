import pool from '../config/db.js';

/**
 * 이메일로 사용자를 찾습니다. (인증용, 비밀번호 포함)
 * @param {string} email
 * @returns {Promise<object|null>} 사용자 객체 또는 null
 */
export const findUserForAuthByEmail = async (email) => {
  const result = await pool.query(
    'SELECT id, email, name, password, position, role, region_metro, region_local, electoral_district FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
};

/**
 * ID로 사용자를 찾습니다. (프로필용, 비밀번호 제외)
 * @param {number} id
 * @returns {Promise<object|null>} 사용자 객체 또는 null
 */
export const findUserById = async (id) => {
  const result = await pool.query(
    'SELECT id, email, name, role, position, region_metro, region_local, electoral_district FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

/**
 * 새로운 사용자를 데이터베이스에 생성합니다.
 * @param {string} email
 * @param {string} hashedPassword
 * @param {string} fullName
 * @returns {Promise<object>} 생성된 사용자 객체
 */
export const createUser = async (email, hashedPassword, fullName) => {
  const newUserResult = await pool.query(
    'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, position, role, region_metro, region_local, electoral_district',
    [email,
    hashedPassword,
    fullName]
  );
  return newUserResult.rows[0];
};