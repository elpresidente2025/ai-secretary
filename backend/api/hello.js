export default function handler(req, res) {
  // 모든 CORS 허용 (테스트용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json({ 
    success: true,
    message: "🎉 Vercel API 연결 성공!",
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url
  });
}