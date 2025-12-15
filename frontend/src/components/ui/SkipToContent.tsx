import React from 'react';

interface SkipToContentProps {
    targetId: string;
    label?: string;
}

/**
 * Skip to main content link for accessibility
 * Allows keyboard users to skip navigation and jump to main content
 */
export default function SkipToContent({
    targetId,
    label = 'Skip to main content'
}: SkipToContentProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <a
            href={`#${targetId}`}
            onClick={handleClick}
            className="skip-to-content"
            style={{
                position: 'absolute',
                left: '-9999px',
                zIndex: 9999,
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--accent)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.25rem',
                fontWeight: 500,
                fontSize: '0.875rem',
            }}
            onFocus={(e) => {
                e.currentTarget.style.left = '1rem';
                e.currentTarget.style.top = '1rem';
            }}
            onBlur={(e) => {
                e.currentTarget.style.left = '-9999px';
            }}
        >
            {label}
        </a>
    );
}
