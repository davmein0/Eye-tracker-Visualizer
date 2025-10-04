import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface CodeRegion {
  name: string;
  totalTime: number;
  fixationCount: number;
  complexity: 'low' | 'medium' | 'high';
}

interface CodeAnalysisPanelProps {
  currentTime: number;
  totalDuration: number;
}

export function CodeAnalysisPanel({ currentTime, totalDuration }: CodeAnalysisPanelProps) {
  const codeRegions: CodeRegion[] = [
    { name: 'Function Signature', totalTime: 1400, fixationCount: 3, complexity: 'medium' },
    { name: 'Variable Declarations', totalTime: 1200, fixationCount: 3, complexity: 'low' },
    { name: 'For Loop Logic', totalTime: 2000, fixationCount: 4, complexity: 'high' },
    { name: 'Conditional Statement', totalTime: 1750, fixationCount: 3, complexity: 'high' },
    { name: 'Array Operations', totalTime: 1250, fixationCount: 3, complexity: 'medium' },
    { name: 'Return Statement', totalTime: 750, fixationCount: 2, complexity: 'low' },
    { name: 'Function Call', totalTime: 1600, fixationCount: 3, complexity: 'medium' },
    { name: 'Comments', totalTime: 1400, fixationCount: 2, complexity: 'low' },
  ];

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplexityBadgeVariant = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'secondary' as const;
      case 'medium': return 'outline' as const;
      case 'high': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  const totalFixations = codeRegions.reduce((sum, region) => sum + region.fixationCount, 0);
  const totalTime = codeRegions.reduce((sum, region) => sum + region.totalTime, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Code Comprehension Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Reading Efficiency</p>
              <div className="flex items-center space-x-2">
                <Progress value={75} className="flex-1" />
                <span className="text-sm">75%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Code Coverage</p>
              <div className="flex items-center space-x-2">
                <Progress value={88} className="flex-1" />
                <span className="text-sm">88%</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-medium">{Math.round(totalTime / totalFixations)}</p>
              <p className="text-xs text-muted-foreground">Avg Time/Fix</p>
            </div>
            <div>
              <p className="text-2xl font-medium">{Math.round(currentTime / totalDuration * 100)}%</p>
              <p className="text-xs text-muted-foreground">Progress</p>
            </div>
            <div>
              <p className="text-2xl font-medium">3.2</p>
              <p className="text-xs text-muted-foreground">Revisit Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code Region Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {codeRegions.map((region, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getComplexityColor(region.complexity)}`} />
                  <div>
                    <p className="text-sm font-medium">{region.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {region.fixationCount} fixations • {region.totalTime}ms
                    </p>
                  </div>
                </div>
                <Badge variant={getComplexityBadgeVariant(region.complexity)} className="text-xs">
                  {region.complexity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reading Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Top-down Reading</span>
            <Badge variant="secondary">65%</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Bottom-up Scanning</span>
            <Badge variant="outline">25%</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Random Access</span>
            <Badge variant="outline">10%</Badge>
          </div>
          
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Strategy Assessment:</strong> Shows systematic code reading with focus on function structure and logic flow. Good comprehension pattern with appropriate time allocation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}