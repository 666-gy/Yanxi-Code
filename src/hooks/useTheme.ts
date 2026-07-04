import { useEffect } from 'react';

export function useTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
  }, []);

  return {
    theme: 'dark',
    isDark: true,
    monacoTheme: 'vs-dark',
  };
}