import { Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../contexts/ThemeContext';

type ThemeToggleProps = {
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size={compact ? 'sm' : 'default'}
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="rounded-full px-3"
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4" />
          {!compact && <span className="hidden sm:inline">Light</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          {!compact && <span className="hidden sm:inline">Dark</span>}
        </>
      )}
    </Button>
  );
}


