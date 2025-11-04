'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/utils/formatNumber';

interface StatCardProps {
  icon: string;
  value: number;
  label: string;
  color: string;
  bgColor: string;
}

export default function StatCard({ icon, value, label, color, bgColor }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // Animación count-up
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1500; // 1.5 segundos
    const increment = end / (duration / 16); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Icono */}
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            {icon}
          </div>

          {/* Valor y Label */}
          <div className="flex-1 min-w-0">
            <div
              className="text-3xl font-bold mb-1 tabular-nums"
              style={{ color }}
            >
              {formatNumber(displayValue)}
            </div>
            <div className="text-sm font-medium text-muted-foreground truncate">
              {label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
