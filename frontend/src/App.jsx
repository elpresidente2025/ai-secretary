import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // 서버에서 받아온 메시지를 저장할 공간
  const [message, setMessage] = useState('');

  // 화면이 처음 나타날 때 백엔드 API를 자동으로 호출
  useEffect(() => {
    fetch('/api/test')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => console.error("API 호출 에러:", err));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI비서관 서비스</h1>
        <p>백엔드 서버로부터 받은 메시지:</p>
        <p className="server-message">
          {message ? message : '서버 응답을 기다리는 중...'}
        </p>
      </header>
    </div>
  );
}

export default App;