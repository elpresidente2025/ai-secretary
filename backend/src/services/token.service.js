import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not set in the .env file.');
}

/**
 * JWT 페이로드를 생성합니다.
 * @param {object} user - 데이터베이스에서 조회한 사용자 객체
 * @returns {object} JWT 페이로드
 */
export const createJwtPayload = (user) => {
  // 페이로드에는 민감하지 않은 최소한의 정보만 담는 것이 좋습니다.
  // id와 role만으로도 사용자를 식별하고 권한을 제어하기에 충분합니다.
  return {
    id: user.id,
    role: user.role,
  };
};

/**
 * JWT를 서명하고 쿠키에 설정합니다.
 * @param {object} res - Express 응답 객체
 * @param {object} payload - JWT 페이로드
 */
export const signAndSetCookie = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'strict' can cause issues in some browser/proxy environments; 'lax' is a safer default.
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: '/',
  });
};