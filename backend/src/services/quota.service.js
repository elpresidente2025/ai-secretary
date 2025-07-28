import pool from '../config/db.js';

/**
 * 사용자의 현재 월 사용량과 총 할당량을 가져옵니다.
 * @param {string} userId - 사용자 ID
 * @returns {Promise<{currentUsage: number, totalUsage: number}>}
 */
export async function getUserQuota(userId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageResult = await pool.query(
        'SELECT COUNT(*) FROM posts WHERE author_id = $1 AND created_at >= $2',
        [userId, startOfMonth]
    );
    const currentUsage = parseInt(usageResult.rows[0].count, 10);

    const userResult = await pool.query('SELECT monthly_quota FROM users WHERE id = $1', [userId]);
    // 기본 할당량을 100으로 설정합니다.
    const totalUsage = userResult.rows.length > 0 ? userResult.rows[0].monthly_quota : 100;

    return { currentUsage, totalUsage };
}

export async function isQuotaExceeded(userId, userRole) {
    if (userRole === 'admin') {
        return false;
    }
    const { currentUsage, totalUsage } = await getUserQuota(userId);
    return currentUsage >= totalUsage;
}
