'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useAurora } from '@aurora/ui';

export const RouteTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { motionEnabled } = useAurora();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={motionEnabled ? { opacity: 0, y: 4 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        exit={motionEnabled ? { opacity: 0, y: -4 } : { opacity: 1, y: 0 }}
        transition={{ duration: motionEnabled ? 0.25 : 0, ease: 'easeInOut' }}
        className="space-y-10"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
