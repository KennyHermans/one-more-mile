import { useEffect } from "react";

// Skip-to-content link for accessibility
export const SkipToContent = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md transition-all"
    tabIndex={0}
  >
    Skip to main content
  </a>
);

// Keyboard navigation improvements
export const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + 1: Navigate to home
      if (event.altKey && event.key === '1') {
        event.preventDefault();
        window.location.href = '/';
      }
      
      // Alt + 2: Navigate to explore
      if (event.altKey && event.key === '2') {
        event.preventDefault();
        window.location.href = '/explore';
      }
      
      // Alt + 3: Navigate to dashboard (if logged in)
      if (event.altKey && event.key === '3') {
        event.preventDefault();
        const user = document.querySelector('[data-user-authenticated]');
        if (user) {
          window.location.href = '/customer/dashboard';
        }
      }
      
      // Escape key: Close modals/dialogs
      if (event.key === 'Escape') {
        const closeButton = document.querySelector('[data-dialog-close]') as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};

// Focus management for dynamic content
export const useFocusManagement = () => {
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const focusFirstElement = (containerSelector: string) => {
    const container = document.querySelector(containerSelector);
    if (container) {
      const focusableElement = container.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      if (focusableElement) {
        focusableElement.focus();
      }
    }
  };

  return { announceToScreenReader, focusFirstElement };
};

// ARIA labels and descriptions helper
export const getAriaProps = (
  label: string,
  description?: string,
  required?: boolean
) => {
  const props: Record<string, string> = {
    'aria-label': label,
  };
  
  if (description) {
    props['aria-describedby'] = `desc-${label.replace(/\s+/g, '-').toLowerCase()}`;
  }
  
  if (required) {
    props['aria-required'] = 'true';
  }
  
  return props;
};

// High contrast mode detection
export const useHighContrastMode = () => {
  useEffect(() => {
    const checkHighContrast = () => {
      const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      document.documentElement.setAttribute('data-high-contrast', isHighContrast.toString());
    };

    checkHighContrast();
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    mediaQuery.addEventListener('change', checkHighContrast);

    return () => mediaQuery.removeEventListener('change', checkHighContrast);
  }, []);
};

// Reduced motion preference
export const useReducedMotion = () => {
  useEffect(() => {
    const checkReducedMotion = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.documentElement.setAttribute('data-reduced-motion', prefersReducedMotion.toString());
    };

    checkReducedMotion();
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', checkReducedMotion);

    return () => mediaQuery.removeEventListener('change', checkReducedMotion);
  }, []);
};