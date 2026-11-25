import React, { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
}

/**
 * React Bits (reactbits.dev) CountUp:
 * Smoothly animates a numeric value from `from` to `to`.
 */
export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 0.65,
  className = '',
}) => {
  const [value, setValue] = useState(from);

  useEffect(() => {
    const controls = animate(from, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: latest => setValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [from, to, duration]);

  return <span className={className}>{value}</span>;
};
