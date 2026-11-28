import React, { useEffect, useState } from 'react';
import { motion, PanInfo, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CoverflowCarouselProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, isActive: boolean) => React.ReactNode;
  cardWidthClassName?: string;
  stageHeightClassName?: string;
  emptyMessage?: string;
}

/**
 * Motion.dev Carousel: Coverflow
 * 3D perspective coverflow stage with spring physics, drag/swipe,
 * side-card click-to-focus, and keyboard arrow navigation.
 */
export function CoverflowCarousel<T>({
  items,
  getKey,
  renderItem,
  cardWidthClassName = 'w-[300px] sm:w-[380px] md:w-[440px]',
  stageHeightClassName = 'min-h-[380px] sm:min-h-[410px]',
  emptyMessage = 'No businesses match this filter.',
}: CoverflowCarouselProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length === 0) {
      setActiveIndex(0);
    } else if (activeIndex >= items.length) {
      setActiveIndex(items.length - 1);
    }
  }, [items.length, activeIndex]);

  if (items.length === 0) {
    return <p className="text-xs text-neutral-500 font-mono">{emptyMessage}</p>;
  }

  const safeIndex = Math.min(activeIndex, items.length - 1);

  const goPrev = () => setActiveIndex(prev => Math.max(0, prev - 1));
  const goNext = () => setActiveIndex(prev => Math.min(items.length - 1, prev + 1));

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -45 || info.velocity.x < -300) {
      goNext();
    } else if (info.offset.x > 45 || info.velocity.x > 300) {
      goPrev();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
  };

  // Render a 7-card window centered on safeIndex for smooth 60fps 3D transforms
  const visibleEntries = items
    .map((item, index) => ({ item, index, offset: index - safeIndex }))
    .filter(({ offset }) => Math.abs(offset) <= 3);

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-roledescription="carousel"
      aria-label="Business Coverflow Carousel"
      className="space-y-5 focus:outline-none"
    >
      <div
        className={`relative w-full ${stageHeightClassName} flex items-center justify-center overflow-hidden select-none`}
        style={{ perspective: '1200px' }}
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={handleDragEnd}
          className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {visibleEntries.map(({ item, index, offset }) => {
            const absOffset = Math.abs(offset);
            const isActive = offset === 0;
            const translateX = offset * 210;
            const translateZ = -absOffset * 110;
            const rotateY = prefersReducedMotion ? 0 : Math.max(-42, Math.min(42, -offset * 28));
            const scale = isActive ? 1 : Math.max(0.72, 1 - absOffset * 0.12);
            const opacity = isActive ? 1 : Math.max(0.28, 1 - absOffset * 0.28);

            return (
              <motion.div
                key={getKey(item)}
                onClick={() => {
                  if (!isActive) setActiveIndex(index);
                }}
                initial={false}
                animate={{
                  x: translateX,
                  z: translateZ,
                  rotateY,
                  scale,
                  opacity,
                }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }
                }
                style={{
                  zIndex: 20 - absOffset,
                  transformStyle: 'preserve-3d',
                }}
                className={`absolute ${cardWidthClassName} ${
                  isActive
                    ? 'cursor-default'
                    : 'cursor-pointer brightness-75 hover:brightness-90 transition-[filter] duration-200'
                }`}
              >
                <div className={!isActive ? 'pointer-events-none' : ''}>
                  {renderItem(item, isActive)}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Controls & Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={safeIndex === 0}
            aria-label="Previous business"
            className="bf-pill-btn text-xs flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-xs font-mono text-neutral-400 px-2 tabular-nums">
            {safeIndex + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={safeIndex === items.length - 1}
            aria-label="Next business"
            className="bf-pill-btn text-xs flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {items.length <= 18 ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {items.map((item, index) => (
              <button
                key={getKey(item)}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to business ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  index === safeIndex
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="w-full sm:w-56 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={items.length - 1}
              value={safeIndex}
              onChange={event => setActiveIndex(Number(event.target.value))}
              aria-label="Scrub businesses"
              className="w-full accent-white cursor-pointer"
            />
          </div>
        )}

        <span className="text-[11px] font-mono text-neutral-500 hidden md:inline">
          Drag, use ← → keys, or click side cards
        </span>
      </div>
    </div>
  );
}
