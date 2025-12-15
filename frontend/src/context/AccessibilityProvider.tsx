import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';

interface AccessibilityContextType {
    reducedMotion: boolean;
    highContrast: boolean;
    screenReaderOptimized: boolean;
    focusTrap: (element: HTMLElement | null) => void;
    releaseFocusTrap: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(
    undefined
);

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within AccessibilityProvider');
    }
    return context;
}

interface AccessibilityProviderProps {
    children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
    const { settings } = useSettings();
    const focusTrapRef = useRef<HTMLElement | null>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Apply reduced motion preference
    useEffect(() => {
        if (settings.reducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
    }, [settings.reducedMotion]);

    // Apply high contrast preference
    useEffect(() => {
        if (settings.highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    }, [settings.highContrast]);

    // Apply screen reader optimizations
    useEffect(() => {
        if (settings.screenReaderOptimized) {
            document.documentElement.classList.add('screen-reader-optimized');
        } else {
            document.documentElement.classList.remove('screen-reader-optimized');
        }
    }, [settings.screenReaderOptimized]);

    // Focus trap implementation
    const focusTrap = (element: HTMLElement | null) => {
        if (!element) return;

        // Store the currently focused element
        previousFocusRef.current = document.activeElement as HTMLElement;
        focusTrapRef.current = element;

        // Get all focusable elements within the trap
        const focusableElements = element.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Focus the first element
        firstElement.focus();

        // Handle tab key to trap focus
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        element.addEventListener('keydown', handleKeyDown);

        // Cleanup function
        return () => {
            element.removeEventListener('keydown', handleKeyDown);
        };
    };

    const releaseFocusTrap = () => {
        if (previousFocusRef.current) {
            previousFocusRef.current.focus();
            previousFocusRef.current = null;
        }
        focusTrapRef.current = null;
    };

    // Listen for Escape key to release focus trap
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && focusTrapRef.current) {
                releaseFocusTrap();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    const value: AccessibilityContextType = {
        reducedMotion: settings.reducedMotion,
        highContrast: settings.highContrast,
        screenReaderOptimized: settings.screenReaderOptimized,
        focusTrap,
        releaseFocusTrap,
    };

    return (
        <AccessibilityContext.Provider value={value}>
            {children}
        </AccessibilityContext.Provider>
    );
}

// Hook to use focus trap in components
export function useFocusTrap(isActive: boolean, elementRef: React.RefObject<HTMLElement>) {
    const { focusTrap, releaseFocusTrap } = useAccessibility();

    useEffect(() => {
        if (isActive && elementRef.current) {
            focusTrap(elementRef.current);
            return () => releaseFocusTrap();
        }
    }, [isActive, elementRef, focusTrap, releaseFocusTrap]);
}
