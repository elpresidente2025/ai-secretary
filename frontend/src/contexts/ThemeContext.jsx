import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeModeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 로컬스토리지에서 저장된 테마 모드 불러오기
    const savedTheme = localStorage.getItem('themeMode');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // 시스템 다크모드 설정 확인
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // 테마 변경 시 로컬스토리지에 저장
    localStorage.setItem('themeMode', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};