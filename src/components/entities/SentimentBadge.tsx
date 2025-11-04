'use client';

import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import type { SentimentType } from '@/types/entities';

interface SentimentBadgeProps {
  sentiment: SentimentType;
  score?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sentimentConfig = {
  POSITIVE: {
    label: 'Positivo',
    icon: ThumbsUp,
    className: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600'
  },
  NEGATIVE: {
    label: 'Negativo',
    icon: ThumbsDown,
    className: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600'
  },
  NEUTRAL: {
    label: 'Neutral',
    icon: Minus,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    iconColor: 'text-gray-600'
  }
};

export default function SentimentBadge({ 
  sentiment, 
  score, 
  showIcon = true,
  size = 'md' 
}: SentimentBadgeProps) {
  const config = sentimentConfig[sentiment];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses[size]} font-medium inline-flex items-center gap-1.5`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} ${config.iconColor}`} />}
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="font-semibold">
          ({score > 0 ? '+' : ''}{score.toFixed(2)})
        </span>
      )}
    </Badge>
  );
}
