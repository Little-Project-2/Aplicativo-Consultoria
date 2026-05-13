import { themeMeta } from '../../../theme/theme';
import { useThemeStore } from '../../../theme/themeStore';

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const nextTheme = theme === 'fitness-green' ? 'solar-ember' : 'fitness-green';

  return (
    <button
      aria-label={
        nextTheme === 'solar-ember' ? 'Alternar para tema dourado' : 'Alternar para tema verde'
      }
      className="authx-theme-toggle"
      data-testid="theme-toggle"
      onClick={toggleTheme}
      title={themeMeta[nextTheme].label}
      type="button"
    >
      <span className="authx-theme-toggle-track" aria-hidden="true">
        <span className="authx-theme-swatch authx-theme-swatch-green" />
        <span className="authx-theme-swatch authx-theme-swatch-solar" />
        <span className="authx-theme-knob" data-theme={theme} />
      </span>
      <span>{themeMeta[theme].shortLabel}</span>
    </button>
  );
}
