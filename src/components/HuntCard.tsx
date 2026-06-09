'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Clock, Zap, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getTagGradient, getTagEmoji } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';

interface HuntCardProps {
  hunt: Hunt;
  isCompleted?: boolean;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'bg-[#002918] text-[#00e676]',
  medium: 'bg-[#2a1a00] text-[#fbbf24]',
  hard: 'bg-[#2a0a0a] text-[#ff5252]',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export default function HuntCard({ hunt, isCompleted = false }: HuntCardProps) {
  const gradient = getTagGradient(hunt.tags);
  const emoji = getTagEmoji(hunt.tags);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      <Link href={`/hunt/${hunt.id}`} className="block">
        <div className="bg-card rounded-2xl overflow-hidden border border-[#1c2a3a] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          {/* Hero gradient */}
          <div className={cn('bg-gradient-to-br relative h-40 flex items-end p-4', gradient)}>
            <div className="absolute inset-0 bg-black/25" />
            {isCompleted && (
              <div className="absolute top-3 right-3 bg-[#080c14]/80 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 z-10">
                <span className="text-xs font-semibold text-[#00e676]">Completed</span>
              </div>
            )}
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-2xl">{emoji}</span>
              <div className="flex flex-wrap gap-1.5">
                {hunt.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="bg-black/35 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-[17px] font-bold text-[#e8f0fe] leading-snug mb-1.5">
              {hunt.title}
            </h3>
            <p className="text-sm text-[#7a8fa8] leading-relaxed line-clamp-2 mb-3">
              {hunt.story_context}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#1c2a3a]">
              <div className="flex items-center gap-1.5 text-[#7a8fa8]">
                <Clock size={13} strokeWidth={2} />
                <span className="text-xs font-medium">{hunt.estimated_time}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Zap size={13} strokeWidth={2} className="text-[#7a8fa8]" />
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full',
                    DIFFICULTY_STYLES[hunt.difficulty]
                  )}
                >
                  {DIFFICULTY_LABELS[hunt.difficulty]}
                </span>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <Trophy size={13} strokeWidth={2} className="text-accent" />
                <span className="text-xs font-medium text-accent truncate max-w-[120px]">
                  {hunt.reward.split('+')[0].trim()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
