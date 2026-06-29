import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useTheme() {
  const theme = useStore((state) => state.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    
    root.setAttribute('data-theme', theme);
  }, [theme]);

  return {
    theme,
    isDark: theme === 'dark',
    monacoTheme: theme === 'dark' ? 'vs-dark' : 'vs',
  };
}