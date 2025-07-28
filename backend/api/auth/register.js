// api/auth/register.js
export default function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', 'https://ai-secretary-36b03.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;

    // 입력 검증
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: '모든 필드를 입력해주세요.'
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 형식을 입력해주세요.'
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: '비밀번호는 6자 이상이어야 합니다.'
      });
    }

    // 임시 회원가입 로직 (실제로는 DB 저장 필요)
    // 기존 사용자 체크 (임시)
    if (email === 'existing@test.com') {
      return res.status(409).json({
        success: false,
        error: '이미 존재하는 이메일입니다.'
      });
    }

    // 회원가입 성공
    const token = 'temp-register-token-' + Date.now();

    return res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: Date.now().toString(),
        email: email,
        name: name
      },
      token: token
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      error: '회원가입 처리 중 오류가 발생했습니다.'
    });
  }
}