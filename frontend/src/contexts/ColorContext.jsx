import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

// 사이버펑크 색상 옵션
const COLOR_OPTIONS = [
  '#d22730', // 클래식 레드
  '#00ffff', // 시안 (사이버펑크)
  '#00ff41', // 네온 그린 (사이버펑크)
  '#f8c023', // 사이버펑크 옐로우
  '#ff0080', // 마젠타 (사이버펑크)
  '#ffffff'  // 화이트
];

const ColorContext = createContext();

export const useColor = () => {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error('useColor must be used within a ColorProvider');
  }
  return context;
};

export const ColorProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const currentColor = COLOR_OPTIONS[currentColorIndex];

  // Firestore에서 색상 설정 로드
  const loadColorPreference = async () => {
    // 로그인하지 않은 사용자는 localStorage에서 로드
    if (!user?.uid) {
      try {
        const savedIndex = localStorage.getItem('electionDDayColorIndex');
        if (savedIndex !== null) {
          const index = parseInt(savedIndex, 10);
          if (index >= 0 && index < COLOR_OPTIONS.length) {
            setCurrentColorIndex(index);
          }
        }
      } catch (error) {
        console.warn('localStorage 색상 설정 로드 실패:', error);
      }
      setIsLoading(false);
      return;
    }

    try {
      const colorDocRef = doc(db, 'user_preferences', user.uid);
      const colorDoc = await getDoc(colorDocRef);

      if (colorDoc.exists() && colorDoc.data().electionDDayColorIndex !== undefined) {
        const savedIndex = colorDoc.data().electionDDayColorIndex;
        if (savedIndex >= 0 && savedIndex < COLOR_OPTIONS.length) {
          setCurrentColorIndex(savedIndex);
        }
      }
    } catch (error) {
      console.warn('Firestore 색상 설정 로드 실패, localStorage로 fallback:', error);
      // Firestore 실패시 localStorage에서 로드
      try {
        const savedIndex = localStorage.getItem('electionDDayColorIndex');
        if (savedIndex !== null) {
          const index = parseInt(savedIndex, 10);
          if (index >= 0 && index < COLOR_OPTIONS.length) {
            setCurrentColorIndex(index);
          }
        }
      } catch (localError) {
        console.warn('localStorage 색상 설정 로드도 실패:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Firestore에 색상 설정 저장
  const saveColorPreference = async (newIndex) => {
    // 로그인하지 않은 사용자는 localStorage에 저장
    if (!user?.uid) {
      try {
        localStorage.setItem('electionDDayColorIndex', newIndex.toString());
      } catch (error) {
        console.warn('localStorage 색상 설정 저장 실패:', error);
      }
      return;
    }

    try {
      const colorDocRef = doc(db, 'user_preferences', user.uid);
      await setDoc(colorDocRef, {
        electionDDayColorIndex: newIndex,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.warn('Firestore 색상 설정 저장 실패, localStorage로 fallback:', error);
      // Firestore 실패시 localStorage에 저장
      try {
        localStorage.setItem('electionDDayColorIndex', newIndex.toString());
      } catch (localError) {
        console.warn('localStorage 색상 설정 저장도 실패:', localError);
      }
    }
  };

  // 색상 변경 함수
  const changeColor = async (direction) => {
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentColorIndex === 0 ? COLOR_OPTIONS.length - 1 : currentColorIndex - 1;
    } else {
      newIndex = currentColorIndex === COLOR_OPTIONS.length - 1 ? 0 : currentColorIndex + 1;
    }

    setCurrentColorIndex(newIndex);
    await saveColorPreference(newIndex);
  };

  // 사용자 변경 시 색상 로드
  useEffect(() => {
    loadColorPreference();
  }, [user?.uid]);

  const value = {
    currentColor,
    currentColorIndex,
    colorOptions: COLOR_OPTIONS,
    changeColor,
    isLoading
  };

  return (
    <ColorContext.Provider value={value}>
      {children}
    </ColorContext.Provider>
  );
};