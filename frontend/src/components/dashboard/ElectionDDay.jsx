// frontend/src/components/ElectionDDay.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Users, Vote } from 'lucide-react';

/**
 * 선거일 디데이 컴포넌트
 * @param {Object} props
 * @param {string} props.position - 직책 ('국회의원', '광역의원', '기초의원')
 * @param {string} props.status - 상태 ('현역', '예비')
 */
function ElectionDDay({ position, status }) {
  const [electionInfo, setElectionInfo] = useState(null);
  const [dDay, setDDay] = useState(null);

  // 선거 정보 설정
  useEffect(() => {
    const getElectionInfo = () => {
      const currentYear = new Date().getFullYear();
      
      if (position === '국회의원') {
        // 국회의원 선거 (4년마다, 2024년 기준)
        const nextElectionYear = Math.ceil((currentYear - 2024) / 4) * 4 + 2024;
        const electionDate = new Date(nextElectionYear, 3, 10); // 4월 10일 (예상)
        
        return {
          type: '제23대 국회의원 선거',
          date: electionDate,
          description: '총선',
          icon: Vote,
          color: 'bg-blue-500'
        };
      } else if (position === '광역의원' || position === '기초의원') {
        // 지방선거 (4년마다, 2026년 기준)
        const nextElectionYear = Math.ceil((currentYear - 2026) / 4) * 4 + 2026;
        const electionDate = new Date(nextElectionYear, 5, 1); // 6월 1일 (예상)
        
        return {
          type: '제9회 전국동시지방선거',
          date: electionDate,
          description: '지선',
          icon: Users,
          color: 'bg-green-500'
        };
      }
      
      return null;
    };

    const info = getElectionInfo();
    setElectionInfo(info);
  }, [position]);

  // 디데이 계산
  useEffect(() => {
    if (!electionInfo) return;

    const calculateDDay = () => {
      const today = new Date();
      const electionDate = electionInfo.date;
      
      // 시간 정규화 (날짜만 비교)
      today.setHours(0, 0, 0, 0);
      electionDate.setHours(0, 0, 0, 0);
      
      const diffTime = electionDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    };

    const days = calculateDDay();
    setDDay(days);

    // 매일 자정에 업데이트
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow - now;
    
    const timeout = setTimeout(() => {
      setDDay(calculateDDay());
      
      // 이후 24시간마다 업데이트
      const interval = setInterval(() => {
        setDDay(calculateDDay());
      }, 24 * 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, [electionInfo]);

  // 선거 정보가 없으면 렌더링하지 않음
  if (!electionInfo || dDay === null) {
    return null;
  }

  // 디데이 텍스트 포맷팅
  const formatDDay = (days) => {
    if (days > 0) {
      return `D-${days}`;
    } else if (days === 0) {
      return '투표일';
    } else {
      return `D+${Math.abs(days)}`;
    }
  };

  // 디데이 색상 결정
  const getDDayColorClass = (days) => {
    if (days <= 0) {
      return 'text-red-600 bg-red-50';
    } else if (days <= 30) {
      return 'text-orange-600 bg-orange-50';
    } else if (days <= 365) {
      return 'text-blue-600 bg-blue-50';
    } else {
      return 'text-gray-600 bg-gray-50';
    }
  };

  const Icon = electionInfo.icon;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${electionInfo.color} text-white`}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {electionInfo.description} 일정
          </h3>
          <p className="text-sm text-gray-600">
            {electionInfo.type}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          <span>
            {electionInfo.date.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short'
            })}
          </span>
        </div>

        <div className="text-center">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getDDayColorClass(dDay)}`}>
            {formatDDay(dDay)}
          </div>
        </div>

        {status === '예비' && dDay > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>예비후보 공천 준비</strong><br />
              SNS 활동 지수가 공천에 반영됩니다.
            </p>
          </div>
        )}

        {status === '현역' && dDay > 0 && dDay <= 365 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>선거 준비 기간</strong><br />
              의정활동 홍보를 통해 지지기반을 강화하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ElectionDDay;