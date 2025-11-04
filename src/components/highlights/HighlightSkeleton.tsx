import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function HighlightSkeleton() {
  return (
    <div className="space-y-8 mb-12">
      {/* Título skeleton */}
      <div className="flex justify-center">
        <div className="h-10 bg-muted rounded-lg w-64 animate-pulse"></div>
      </div>
      
      {/* Secciones skeleton */}
      {[1, 2].map((i) => (
        <Card key={i} className="overflow-hidden">
          {/* Header skeleton */}
          <div className="p-6 bg-muted/30 border-l-4 border-muted animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </div>
            </div>
          </div>
          
          {/* Grid de cards skeleton */}
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((j) => (
                <Card key={j} className="animate-pulse">
                  <CardHeader className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-5 bg-muted rounded w-16"></div>
                      <div className="h-4 bg-muted rounded w-20"></div>
                    </div>
                    <div className="h-5 bg-muted rounded w-full"></div>
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-4 bg-muted rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}