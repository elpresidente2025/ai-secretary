import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function DashboardPage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPost, setGeneratedPost] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic) {
      alert('원고 주제를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setGeneratedPost('');
    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedPost(data.content);
      } else {
        alert(`생성 실패: ${data.message}`);
      }
    } catch (error) {
      alert('원고 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('isLoggedIn');
      alert('로그아웃 되었습니다.');
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 중 에러 발생:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  return (
    <div>
      <h2>대시보드</h2>
      <button onClick={handleLogout}>로그아웃</button>
      
      <hr />

      <h3>AI 블로그 원고 생성</h3>
      <form onSubmit={handleGenerate}>
        <div>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 우리 동네 어린이 놀이터 안전 점검 및 개선 방안"
            rows="5"
            style={{ width: '90%', padding: '10px', marginTop: '10px' }}
          />
        </div>
        <button type="submit" disabled={isLoading} style={{ marginTop: '10px' }}>
          {isLoading ? '생성 중...' : '원고 생성하기'}
        </button>
      </form>
      
      {generatedPost && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', whiteSpace: 'pre-wrap', textAlign: 'left', background: '#f9f9f9' }}>
          <h4>생성된 원고:</h4>
          <p>{generatedPost}</p>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;