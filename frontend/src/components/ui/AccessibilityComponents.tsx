import React, { useEffect, useState } from 'react';

interface FocusIndicatorProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Enhanced focus indicator for keyboard navigation
 * Adds visible focus ring and announcements for screen readers
 */
export function FocusIndicator({ children, className = '' }: FocusIndicatorProps) {
    const [isKeyboardUser, setIsKeyboardUser] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                setIsKeyboardUser(true);
            }
        };

        const handleMouseDown = () => {
            setIsKeyboardUser(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleMouseDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleMouseDown);
        };
    }, []);

    return (
        <div
            className={`${className} ${isKeyboardUser ? 'keyboard-focus-visible' : ''}`}
            data-keyboard-user={isKeyboardUser}
        >
            {children}
        </div>
    );
}

/**
 * Live region for screen reader announcements
 */
interface LiveRegionProps {
    message: string;
    politeness?: 'polite' | 'assertive';
    clearAfter?: number; // milliseconds
}

export function LiveRegion({
    message,
    politeness = 'polite',
    clearAfter = 3000
}: LiveRegionProps) {
    const [currentMessage, setCurrentMessage] = useState(message);

    useEffect(() => {
        setCurrentMessage(message);

        if (clearAfter > 0) {
            const timer = setTimeout(() => {
                setCurrentMessage('');
            }, clearAfter);

            return () => clearTimeout(timer);
        }
    }, [message, clearAfter]);

    return (
        <div
            role="status"
            aria-live={politeness}
            aria-atomic="true"
            className="sr-only"
        >
            {currentMessage}
        </div>
    );
}

/**
 * Screen reader only text
 */
interface SrOnlyProps {
    children: React.ReactNode;
}

export function SrOnly({ children }: SrOnlyProps) {
    return (
        <span className="sr-only">
            {children}
        </span>
    );
}
