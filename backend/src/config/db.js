import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

// .env 파일에서 데이터베이스 연결 주소를 가져옵니다.

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 데이터베이스에 성공적으로 연결되었는지 확인하는 테스트 쿼리
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL 연결에 실패했습니다:', err);
  } else {
    console.log('✅ PostgreSQL에 성공적으로 연결되었습니다. 현재 시간:', res.rows[0].now);
  }
});

export default pool;
