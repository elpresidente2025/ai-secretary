import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * @description 신규 사용자를 등록하고 데이터베이스에 저장합니다.
 * @param {string} email - 사용자 이메일
 * @param {string} password - 사용자 비밀번호
 * @param {string} fullName - 사용자 이름
 * @returns {Promise<object>} 생성된 사용자 정보 (비밀번호 제외)
 */
export const registerUser = async (email, password, fullName) => {
  // 1. 입력값 유효성 검사 강화
  if (!email || !password || !fullName) {
    const error = new Error('이메일, 비밀번호, 이름을 모두 입력해주세요.');
    error.statusCode = 400;
    throw error;
  }

  // 이메일 형식 검사 (간단한 정규식)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const error = new Error('유효하지 않은 이메일 형식입니다.');
    error.statusCode = 400;
    throw error;
  }

  // 비밀번호 길이 검사
  if (password.length < 8) {
    const error = new Error('비밀번호는 8자 이상이어야 합니다.');
    error.statusCode = 400;
    throw error;
  }

  // 2. 비밀번호 해싱
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. 데이터베이스에 사용자 저장
  try {
    const newUserQuery = `
      INSERT INTO users (email, password, full_name)
      VALUES ($1, $2, $3)
      RETURNING id, email, full_name, role, region, created_at
    `;
    const result = await pool.query(newUserQuery, [email, passwordHash, fullName]);
    return result.rows[0];
  } catch (err) {
    // 4. 에러 처리 (유니크 제약 조건 위반)
    if (err.code === '23505') { // 'unique_violation' for PostgreSQL
      const error = new Error('이미 가입된 이메일입니다.');
      error.statusCode = 409; // Conflict
      throw error;
    }
    // 그 외 데이터베이스 오류
    console.error('[Service] Database error during user registration:', err);
    const error = new Error('사용자 등록 중 서버 오류가 발생했습니다.');
    error.statusCode = 500;
    throw error;
  }
};

/**
 * @description 사용자 로그인을 처리하고 JWT를 발급합니다.
 * @param {string} email - 사용자 이메일
 * @param {string} password - 사용자 비밀번호
 * @returns {Promise<{token: string, user: object}>} JWT와 사용자 정보
 */
export const loginUser = async (email, password) => {
  console.log(`[Service] 로그인 시도: ${email}`);

  // 1. 이메일로 사용자 찾기 (프론트엔드에서 필요한 모든 정보를 조회하도록 수정)
  const userResult = await pool.query(
    `SELECT id, email, password, full_name, role, position, 
            region_metro, region_local, electoral_district 
     FROM users WHERE email = $1`,
    [email]
  );
  const user = userResult.rows[0];

  // 2. 사용자가 없는 경우
  if (!user) {
    console.error(`[Service] ❌ 사용자를 찾을 수 없음: ${email}`);
    const error = new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    error.statusCode = 401; // Unauthorized
    throw error;
  }

  console.log(`[Service] ✅ 사용자 찾음: ${user.email} (ID: ${user.id})`);

  // 3. 비밀번호 비교
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  // 4. 비밀번호가 일치하지 않는 경우
  if (!isPasswordCorrect) {
    console.error(`[Service] ❌ 비밀번호 불일치: ${email}`);
    const error = new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    error.statusCode = 401;
    throw error;
  }

  console.log(`[Service] ✅ 로그인 성공: ${email}`);

  // 5. 프론트엔드로 보낼 사용자 정보 객체 생성 (비밀번호 제외)
  const userForToken = {
    id: user.id,
    email: user.email,
    name: user.full_name, // 'full_name'을 'name'으로 매핑
    role: user.role,
    position: user.position,
    region_metro: user.region_metro,
    region_local: user.region_local,
    electoral_district: user.electoral_district,
  };

  // 6. JWT 생성 (페이로드에는 민감하지 않은 최소한의 정보만 담는 것이 좋습니다)
  // token.service.js 에서는 id와 role만 담도록 개선되었으므로, 여기도 일관성을 맞춥니다.
  // email 같은 정보는 토큰에 불필요합니다.
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

  return { token, user: userForToken };
};
