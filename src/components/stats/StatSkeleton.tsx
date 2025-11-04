import { Card, CardContent } from '@/components/ui/card';

export default function StatSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-muted rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-8 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-32"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
