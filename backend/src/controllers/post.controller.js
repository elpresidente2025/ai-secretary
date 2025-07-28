import pool from '../config/db.js';
import { isQuotaExceeded } from '../services/quota.service.js';
import { generateManuscript } from '../services/gemini.service.js';
import { findUserById } from '../models/user.model.js';


/**
 * 데이터베이스 post 객체를 프론트엔드 응답 형식으로 변환합니다.
 * @param {object} dbPost - 데이터베이스에서 조회한 post 객체 (snake_case)
 * @returns {object} 프론트엔드에 전달할 post 객체 (camelCase)
 */
const _transformPostForResponse = (dbPost) => {
  if (!dbPost) {
    return null;
  }
  return {
    id: dbPost.id,
    title: dbPost.title,
    content: dbPost.content,
    status: dbPost.status,
    createdAt: dbPost.created_at, // snake_case -> camelCase
  };
};

/**
 * @description AI를 이용해 새 게시물 초안 3개를 생성하는 컨트롤러 (DB 저장 X)
 */
export const generateDrafts = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user; // JWT 토큰에서 사용자 ID와 역할을 가져옵니다.
    const { prompt, keywords } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: '생성을 위한 프롬프트가 필요합니다.' });
    }

    // 할당량 확인
    if (await isQuotaExceeded(userId, role)) {
      return res.status(429).json({ error: '이번 달 포스트 생성 할당량을 모두 사용했습니다.' }); // 429 Too Many Requests
    }

    // 페르소나 주입을 위해 사용자 프로필 정보를 조회합니다.
    const userProfile = await findUserById(userId);
    if (!userProfile) {
      // 토큰이 유효하다면 이 경우는 거의 발생하지 않지만, 안정성을 위해 추가합니다.
      return res.status(404).json({ error: '사용자 프로필을 찾을 수 없습니다.' });
    }

    // Gemini 서비스에 사용자 프로필과 프롬프트를 함께 전달하여 초안을 생성합니다.
    const drafts = await generateManuscript({
      userProfile,
      prompt,
      keywords,
    });
    
    res.status(200).json({ drafts });
  } catch (error) {
    console.error('초안 생성 중 에러 발생:', error);
    next(error);
  }
};

/**
 * @description 사용자가 선택한 초안으로 새 포스트를 생성하고 DB에 저장하는 컨트롤러
 */
export const createPost = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { title, content } = req.body;

    const dbResult = await pool.query(
      'INSERT INTO posts (title, content, author_id) VALUES ($1, $2, $3) RETURNING *',
      [title || '제목 없음', content, userId]
    );
    
    res.status(201).json({ message: "포스트가 성공적으로 생성 및 저장되었습니다.", post: _transformPostForResponse(dbResult.rows[0]) });
  } catch (error) {
    console.error('포스트 생성 중 에러 발생:', error);
    next(error);
  }
};

/**
 * @description 현재 사용자의 모든 게시물을 조회하는 컨트롤러
 */
export const getAllPosts = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const result = await pool.query(
      'SELECT id, title, created_at, status FROM posts WHERE author_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    // 여러 게시물 목록도 모두 camelCase로 변환합니다.
    const posts = result.rows.map(_transformPostForResponse);
    res.status(200).json({ posts });
  } catch (error) {
    console.error('모든 게시물 조회 중 에러 발생:', error);
    next(error);
  }
};

/**
 * @description ID로 특정 게시물을 조회하는 컨트롤러
 */
export const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    const result = await pool.query(
      'SELECT * FROM posts WHERE id = $1 AND author_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '게시물을 찾을 수 없거나 접근 권한이 없습니다.' });
    }

    res.status(200).json({ post: _transformPostForResponse(result.rows[0]) });
  } catch (error) {
    console.error('게시물 조회 중 에러 발생:', error);
    next(error);
  }
};

/**
 * @description ID로 특정 게시물을 업데이트하는 컨트롤러
 */
export const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const { id: userId } = req.user;

    const result = await pool.query(
      'UPDATE posts SET content = $1 WHERE id = $2 AND author_id = $3 RETURNING *',
      [content, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '게시물을 찾을 수 없거나 업데이트할 권한이 없습니다.' });
    }

    res.status(200).json({ message: '포스트가 성공적으로 업데이트되었습니다.', post: _transformPostForResponse(result.rows[0]) });
  } catch (error) {
    console.error('게시물 업데이트 중 에러 발생:', error);
    next(error);
  }
};
