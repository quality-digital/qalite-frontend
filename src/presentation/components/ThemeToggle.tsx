import { useTheme } from '../context/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      aria-pressed={theme === 'dark'}
      data-theme-state={theme}
    >
      <span className="theme-toggle__icon" aria-hidden>
        {theme === 'light' ? '🌞' : '🌙'}
      </span>
      <span className="theme-toggle__label">
        {theme === 'light' ? 'Modo claro' : 'Modo escuro'}
      </span>
    </button>
  );
};
