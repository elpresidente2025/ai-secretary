const authService = require('../services/auth.service');

const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해주세요.' });
    
    const newUser = await authService.registerUser(email, password);
    res.status(201).json({ message: '회원가입 성공!', user: newUser });
  } catch (err) {
    // --- 에러 로그 출력 부분 추가 ---
    console.error(err); 
    res.status(err.statusCode || 500).json({ message: err.message || '서버 내부 오류' });
  }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(401).json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });

        const result = await authService.loginUser(email, password);
        if (!result) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        }
        
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000
        });

        res.status(200).json({ message: '로그인 성공!', userId: result.user.id });
    } catch (err) {
        // --- 에러 로그 출력 부분 추가 ---
        console.error(err); 
        res.status(500).json({ message: '서버 내부 오류' });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: '로그아웃 성공!' });
};

module.exports = { register, login, logout };