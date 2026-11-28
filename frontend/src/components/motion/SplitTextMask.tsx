import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface SplitTextMaskProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
}

/**
 * Motion.dev Split Text Mask Reveal:
 * Splits text into word tokens wrapped in overflow-hidden mask containers
 * and animates each token upward from behind the mask with staggered timing.
 */
export const SplitTextMask: React.FC<SplitTextMaskProps> = ({
  text,
  as: Component = 'h1',
  className = '',
  delay = 0.04,
  stagger = 0.045,
  duration = 0.65,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const words = text.trim().split(/\s+/);

  return (
    <Component className={className} aria-label={text}>
      {words.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          <span
            aria-hidden="true"
            className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]"
          >
            <motion.span
              className="inline-block will-change-transform"
              initial={prefersReducedMotion ? { opacity: 1, y: '0%' } : { opacity: 0, y: '110%' }}
              animate={{ opacity: 1, y: '0%' }}
              transition={{
                duration: prefersReducedMotion ? 0 : duration,
                delay: prefersReducedMotion ? 0 : delay + index * stagger,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </Component>
  );
};
