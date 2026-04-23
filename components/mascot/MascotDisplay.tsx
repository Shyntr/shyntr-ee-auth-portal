'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MascotDisplay({ password = false } : {password: boolean}) {
    return (
        <div className="relative md:w-32 md:h-32 sm:w-28 sm:h-28 max-h-32 max-w-32 select-none">
            <AnimatePresence mode="wait">
                <motion.img
                    key={password ? 'password' : 'idle'}
                    src={password ? '/mascot_closed.png' : '/mascot.png'}
                    alt="Mascot"
                    className="w-full h-full object-contain drop-shadow-lg"
                    initial={{ scale: 1, opacity: 0.9 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1, opacity: 0.9 }}
                    transition={{ duration: 0.15, ease: 'linear' }}
                    draggable={false}
                />
            </AnimatePresence>
        </div>
    );
}