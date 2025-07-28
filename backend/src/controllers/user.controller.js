import pool from '../config/db.js'; // 데이터베이스 연결 설정을 가져옵니다.

/**
 * 사용자의 프로필 정보를 업데이트합니다.
 * 이 함수는 인증된 사용자의 ID를 사용하며, 요청 본문에서 프로필 데이터를 받습니다.
 */
export const updateProfile = async (req, res) => {
  // 인증 미들웨어에서 사용자 ID를 가져옵니다.
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: '인증되지 않은 사용자입니다. 사용자 ID를 찾을 수 없습니다.' });
  }

  // 프론트엔드에서 보낸 프로필 데이터를 받습니다.
  const { name, position, regionMetro, regionLocal, electoralDistrict } = req.body;

  try {
    // 데이터베이스의 'users' 테이블을 업데이트하는 SQL 쿼리입니다.
    // 문제가 되었던 'full_name'을 'name'으로 수정했습니다.
    // 또한, 데이터베이스의 snake_case 컬럼명(예: region_metro)과 코드의 변수명을 매칭시킵니다.
    const query = `
      UPDATE users
      SET 
        name = $1,
        position = $2,
        region_metro = $3,
        region_local = $4,
        electoral_district = $5
      WHERE id = $6
      RETURNING id, name, email, role, position, region_metro, region_local, electoral_district;
    `;

    const values = [name, position, regionMetro, regionLocal, electoralDistrict, userId];

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없거나 프로필을 업데이트할 수 없습니다.' });
    }

    const dbUser = rows[0];

    // 프론트엔드에서 사용하는 camelCase 형식에 맞게 사용자 객체를 변환하여 응답합니다.
    const updatedUser = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      position: dbUser.position,
      regionMetro: dbUser.region_metro,
      regionLocal: dbUser.region_local,
      electoralDistrict: dbUser.electoral_district,
    };

    res.status(200).json({
      message: '프로필이 성공적으로 업데이트되었습니다.',
      user: updatedUser,
    });

  } catch (err) {
    // 서버에 상세한 오류를 기록하여 디버깅에 활용합니다.
    console.error('프로필 업데이트 오류:', err.message);

    // 클라이언트에게는 일반적인 오류 메시지를 보냅니다.
    res.status(500).json({ error: '프로필 업데이트 중 서버에서 오류가 발생했습니다.' });
  }
};

// 이 파일에 다른 컨트롤러 함수(예: getUser)가 있다면,
// 해당 함수들도 'name' 컬럼을 사용하도록 함께 확인해주세요.
