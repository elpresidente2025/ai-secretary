import pool from '../config/db.js';

export const getAllUsers = async (req, res, next) => {
  try {
    // 정렬을 위해 created_at을 추가로 조회합니다.
    const result = await pool.query('SELECT id, email, name, position, role, region_metro, region_local, electoral_district, created_at FROM users ORDER BY created_at DESC');
    
    // API 응답 시 DB의 snake_case를 camelCase로 변환하여 일관성을 유지합니다.
    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      position: user.position,
      role: user.role,
      regionMetro: user.region_metro,
      regionLocal: user.region_local,
      electoralDistrict: user.electoral_district,
      createdAt: user.created_at,
    }));

    res.status(200).json(users);
  } catch (error) {
    console.error('Admin get users error:', error);
    next(error);
  }
};
