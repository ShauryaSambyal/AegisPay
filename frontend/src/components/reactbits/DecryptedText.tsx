import React, { useEffect, useState } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  characters?: string;
  className?: string;
}

/**
 * React Bits (reactbits.dev) DecryptedText:
 * Scrambles text with random glyphs before resolving into the target string.
 */
export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 28,
  maxIterations = 10,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*',
  className = '',
}) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    let iteration = 0;
    const interval = window.setInterval(() => {
      const revealedCount = Math.floor((iteration / maxIterations) * text.length);
      const next = text
        .split('')
        .map((char, idx) => {
          if (char === ' ') return ' ';
          if (idx < revealedCount) return text[idx];
          return characters[Math.floor(Math.random() * characters.length)];
        })
        .join('');

      setDisplayText(next);
      iteration += 1;

      if (iteration > maxIterations) {
        window.clearInterval(interval);
        setDisplayText(text);
      }
    }, speed);

    return () => window.clearInterval(interval);
  }, [text, speed, maxIterations, characters]);

  return <span className={className}>{displayText}</span>;
};
