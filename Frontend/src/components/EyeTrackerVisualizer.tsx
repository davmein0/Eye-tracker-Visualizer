import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Code, BarChart3, Eye } from 'lucide-react';
import { CodeAnalysisPanel } from './CodeAnalysisPanel';

interface FixationPoint {
  x: number;
  y: number;
  duration: number;
  timestamp: number;
  id: number;
}

interface GazeData {
  fixations: FixationPoint[];
  screenWidth: number;
  screenHeight: number;
}


// Sample eye-tracking data for code reading patterns
// const sampleData: GazeData = {
//   screenWidth: 900,
//   screenHeight: 700,
//   fixations: [
//     // Function signature - high attention
//     { id: 1, x: 120, y: 120, duration: 600, timestamp: 0 },
//     { id: 2, x: 200, y: 120, duration: 450, timestamp: 600 },
//     { id: 3, x: 280, y: 120, duration: 350, timestamp: 1050 },
//
//     // Opening brace scan
//     { id: 4, x: 380, y: 120, duration: 200, timestamp: 1400 },
//
//     // Variable declaration - careful reading
//     { id: 5, x: 150, y: 160, duration: 500, timestamp: 1600 },
//     { id: 6, x: 250, y: 160, duration: 400, timestamp: 2100 },
//     { id: 7, x: 350, y: 160, duration: 300, timestamp: 2500 },
//
//     // For loop - complex logic attention
//     { id: 8, x: 140, y: 200, duration: 800, timestamp: 2800 },
//     { id: 9, x: 220, y: 200, duration: 600, timestamp: 3600 },
//     { id: 10, x: 300, y: 200, duration: 500, timestamp: 4200 },
//     { id: 11, x: 380, y: 200, duration: 400, timestamp: 4700 },
//
//     // Inside loop - scanning condition
//     { id: 12, x: 180, y: 240, duration: 700, timestamp: 5100 },
//     { id: 13, x: 280, y: 240, duration: 600, timestamp: 5800 },
//     { id: 14, x: 420, y: 240, duration: 350, timestamp: 6400 },
//
//     // Array access pattern
//     { id: 15, x: 200, y: 280, duration: 450, timestamp: 6750 },
//     { id: 16, x: 300, y: 280, duration: 500, timestamp: 7200 },
//     { id: 17, x: 400, y: 280, duration: 300, timestamp: 7700 },
//
//     // Return statement - quick scan
//     { id: 18, x: 160, y: 360, duration: 400, timestamp: 8000 },
//     { id: 19, x: 240, y: 360, duration: 350, timestamp: 8400 },
//
//     // Function call - detailed inspection
//     { id: 20, x: 150, y: 440, duration: 650, timestamp: 8750 },
//     { id: 21, x: 250, y: 440, duration: 550, timestamp: 9400 },
//     { id: 22, x: 350, y: 440, duration: 400, timestamp: 9950 },
//
//     // Comment reading
//     { id: 23, x: 200, y: 480, duration: 800, timestamp: 10350 },
//     { id: 24, x: 350, y: 480, duration: 600, timestamp: 11150 },
//
//     // Back to beginning - overview scan
//     { id: 25, x: 120, y: 120, duration: 300, timestamp: 11750 },
//     { id: 26, x: 180, y: 200, duration: 250, timestamp: 12050 },
//     { id: 27, x: 200, y: 360, duration: 200, timestamp: 12300 },
//   ]
// };

export function EyeTrackerVisualizer() {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFixations, setShowFixations] = useState(true);
  const [showGazePath, setShowGazePath] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState([1]);

  const [gazeData, setGazeData] = useState<GazeData | null>(null);

  useEffect(() => {
    async function loadFixations() {
      const res = await fetch("http://localhost:8000/api/fixations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xml_path: "../data/eye_tracking.xml",
          // Dummy data: get info for tokenizing code
          code_path: "../Backend/tokenize_code.py",
          language: "python"
          // ide_xml_path: "/data/ide_tracking.xml"
        })
      });

      const data = await res.json();
      setGazeData(data);
    }

    loadFixations();
  }, []);

//   const totalDuration = Math.max(...sampleData.fixations.map(f => f.timestamp + f.duration));
  const fixations = gazeData?.fixations ?? [];
  //const code = gazeData?.code_str ?? "";

  const totalDuration =
    fixations.length > 0
    ? Math.max(...gazeData.fixations.map(f => f.start_time + f.duration))
    : 0;
  const visibleFixations = fixations.filter(f => f.start_time <= currentTime);
  const currentFixation = fixations.find(f =>
    f.start_time <= currentTime && currentTime < f.start_time + f.duration
  );

  // Statistics
  const totalFixations = fixations.length;
  const averageDuration =
  totalFixations > 0
    ? fixations.reduce((sum, f) => sum + f.duration, 0) / totalFixations
    : 0;

  const longestFixation =
  totalFixations > 0
    ? Math.max(...gazeData.fixations.map(f => f.duration))
    : 0;



  useEffect(() => {
    let animationFrame: number;
    
    if (isPlaying) {
      const animate = () => {
        setCurrentTime(prev => {
          const newTime = prev + (16 * playbackSpeed[0]); // 16ms per frame * speed
          return newTime >= totalDuration ? 0 : newTime;
        });
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame); // why?
      }
    };
  }, [isPlaying, playbackSpeed, totalDuration]);

  useEffect(() => {
    drawVisualization();
  }, [currentTime, showFixations, showGazePath, showHeatmap]);

  const drawVisualization = () => {
    const canvas = canvasRef.current;
    const heatmapCanvas = heatmapCanvasRef.current;
    if (!canvas || !heatmapCanvas) return;

    const ctx = canvas.getContext('2d');
    const heatmapCtx = heatmapCanvas.getContext('2d');
    if (!ctx || !heatmapCtx) return;

    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    heatmapCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);

    // Draw background pattern to simulate content being tracked
    drawBackgroundContent(ctx, canvas.width, canvas.height);

    // Draw heatmap
    if (showHeatmap) {
      drawHeatmap(heatmapCtx, heatmapCanvas.width, heatmapCanvas.height);
    }

    // Draw gaze path
    if (showGazePath && visibleFixations.length > 1) {
      drawGazePath(ctx);
    }

    // Draw fixations
    if (showFixations) {
      drawFixations(ctx);
    }

    // Highlight current fixation
    if (currentFixation) {
      drawCurrentFixation(ctx, currentFixation);
    }
  };

  const drawBackgroundContent = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Code editor background
    ctx.fillStyle = '#1e1e1e'; // Dark theme like VS Code
    ctx.fillRect(0, 0, width, height);

    // Editor sidebar (file explorer)
    ctx.fillStyle = '#252526';
    ctx.fillRect(0, 0, 60, height);
    
    // Line numbers background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(60, 0, 80, height);
    ctx.strokeStyle = '#3e3e3e';
    ctx.beginPath();
    ctx.moveTo(140, 0);
    ctx.lineTo(140, height);
    ctx.stroke();

    // Main code area
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(140, 0, width - 140, height);

    // Draw line numbers
    ctx.fillStyle = '#858585';
    ctx.font = '14px "Consolas", "Monaco", "Courier New", monospace';
    ctx.textAlign = 'right';
    for (let i = 1; i <= 30; i++) {
      ctx.fillText(i.toString(), 130, i * 20 + 5);
    }

    // Reset text alignment and draw code
    ctx.textAlign = 'left';
    const lineHeight = 20;
    let y = 25;

    // JavaScript code with syntax highlighting colors
    let code_array = code.split("\n");
    console.log(code_array);
    console.log("Hi");
    for (let i = 0; i < code_array.length; i++)
    {
      console.log(line);

    }

    const codeLines = useMemo(() => {
      return buildCodeLines(code, tokens);
    }, [code, tokens]);

    //const codeLines = code.split("\n");
//     const codeLines = [
//       { text: code_array[0], color: '#DCDCAA', indent: 0 }, // function keyword
//       { text: '  const length = arr.length;', color: '#9CDCFE', indent: 1 }, // variable
//       { text: '  let maxValue = arr[0];', color: '#9CDCFE', indent: 1 },
//       { text: '  let maxIndex = 0;', color: '#9CDCFE', indent: 1 },
//       { text: '', color: '#D4D4D4', indent: 0 },
//       { text: '  for (let i = 1; i < length; i++) {', color: '#C586C0', indent: 1 }, // for loop
//       { text: '    if (arr[i] > maxValue) {', color: '#C586C0', indent: 2 }, // if statement
//       { text: '      maxValue = arr[i];', color: '#9CDCFE', indent: 3 },
//       { text: '      maxIndex = i;', color: '#9CDCFE', indent: 3 },
//       { text: '    }', color: '#D4D4D4', indent: 2 },
//       { text: '  }', color: '#D4D4D4', indent: 1 },
//       { text: '', color: '#D4D4D4', indent: 0 },
//       { text: '  return {', color: '#C586C0', indent: 1 }, // return
//       { text: '    value: maxValue,', color: '#9CDCFE', indent: 2 },
//       { text: '    index: maxIndex', color: '#9CDCFE', indent: 2 },
//       { text: '  };', color: '#D4D4D4', indent: 1 },
//       { text: '}', color: '#D4D4D4', indent: 0 },
//       { text: '', color: '#D4D4D4', indent: 0 },
//       { text: '// Usage example', color: '#6A9955', indent: 0 }, // comment
//       { text: 'const numbers = [3, 7, 2, 9, 1, 5];', color: '#9CDCFE', indent: 0 },
//       { text: 'const result = findMaxElement(numbers);', color: '#9CDCFE', indent: 0 },
//       { text: 'console.log(`Max: ${result.value}`);', color: '#DCDCAA', indent: 0 }, // string
//       { text: '// Output: Max: 9', color: '#6A9955', indent: 0 },
//     ];

    // Automatically do this, depending on type of file (.py, .tsx, etc)?
    codeLines.forEach((line, index=0) => {
      if (line.text.trim()) {
        ctx.fillStyle = line.color;
        
        // Handle syntax highlighting within lines
        // ?
        const parts = line.text.split(/(\bfunction\b|\bconst\b|\blet\b|\bfor\b|\bif\b|\breturn\b|\bconsole\b)/);
        let xOffset = 150 + (line.indent * 20);
        
        parts.forEach(part => {
          if (['function', 'const', 'let', 'for', 'if', 'return'].includes(part)) {
            ctx.fillStyle = '#C586C0'; // Keywords in purple
          } else if (part === 'console') {
            ctx.fillStyle = '#DCDCAA'; // Built-ins in yellow
          } else if (line.text.includes('//')) {
            ctx.fillStyle = '#6A9955'; // Comments in green
          } else {
            ctx.fillStyle = line.color;
          }

          // Do I need to use the ctx? What are potential alternatives?
          ctx.fillText(part, xOffset, (index + 1) * lineHeight); // fillText?
          xOffset += ctx.measureText(part).width;
        });
      }
      y += lineHeight;
    });

    // Add some editor UI elements
    ctx.fillStyle = '#2d2d30';
    ctx.fillRect(0, 0, width, 30); // Top bar
    
    ctx.fillStyle = '#cccccc';
    ctx.font = '12px sans-serif';
    ctx.fillText('algorithm.js', 150, 20);
    
    // File tab
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(140, 0, 100, 30);
    ctx.strokeStyle = '#3e3e3e';
    ctx.strokeRect(140, 0, 100, 30);
    
    // Cursor indicator (blinking would be nice but static for now)
    const cursorX = 250;
    const cursorY = 160;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cursorX, cursorY - 15, 2, 18);
  };

  const drawHeatmap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Create heatmap based on fixation density
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let intensity = 0;

        // double-check algorithm
        visibleFixations.forEach(fixation => {
          const distance = Math.sqrt((x - fixation.x) ** 2 + (y - fixation.y) ** 2);
          const influence = Math.max(0, 1 - distance / 100) * (fixation.duration / 1000);
          intensity += influence;
        });

        const pixelIndex = (y * width + x) * 4;
        const normalizedIntensity = Math.min(intensity * 100, 255);
        
        // Create heat colors (blue -> green -> yellow -> red)
        // --what's alpha? What criteria?
        if (normalizedIntensity > 0) {
          data[pixelIndex] = Math.min(255, normalizedIntensity * 2); // Red
          data[pixelIndex + 1] = Math.min(255, normalizedIntensity * 1.5); // Green
          data[pixelIndex + 2] = Math.max(0, 255 - normalizedIntensity * 2); // Blue
          data[pixelIndex + 3] = Math.min(150, normalizedIntensity); // Alpha
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const drawGazePath = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    visibleFixations.forEach((fixation, index) => {
      if (index === 0) {
        ctx.moveTo(fixation.x, fixation.y);
      } else {
        ctx.lineTo(fixation.x, fixation.y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw direction arrows
    visibleFixations.forEach((fixation, index) => {
      if (index > 0) {
        const prev = visibleFixations[index - 1];
        const angle = Math.atan2(fixation.y - prev.y, fixation.x - prev.x);
        const arrowX = fixation.x - Math.cos(angle) * 15;
        const arrowY = fixation.y - Math.sin(angle) * 15;

        ctx.fillStyle = '#007bff';
        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-8, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });
  };

  const drawFixations = (ctx: CanvasRenderingContext2D) => {
    visibleFixations.forEach((fixation, index) => {
      const radius = Math.max(8, Math.min(30, fixation.duration / 20));
      
      // Outer circle
      ctx.fillStyle = 'rgba(220, 53, 69, 0.3)';
      ctx.beginPath();
      ctx.arc(fixation.x, fixation.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Inner circle
      ctx.fillStyle = '#dc3545';
      ctx.beginPath();
      ctx.arc(fixation.x, fixation.y, radius / 3, 0, 2 * Math.PI);
      ctx.fill();

      // Fixation number
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), fixation.x, fixation.y + 4);
    });
  };

  const drawCurrentFixation = (ctx: CanvasRenderingContext2D, fixation: FixationPoint) => {
    const radius = Math.max(8, Math.min(30, fixation.duration / 20));
    
    // Pulsing effect
    const pulseRadius = radius + Math.sin((currentTime - fixation.start_time) / 100) * 5;
    
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fixation.x, fixation.y, pulseRadius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSkipBack = () => {
    setCurrentTime(Math.max(0, currentTime - 1000));
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(totalDuration, currentTime + 1000));
  };

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <div className="flex-1 flex">
        {!gazeData ? (
          <div className="flex items-center justify-center h-full">
            Loading…
          </div>
        ) : (
          <>
        {/* Main visualization area */}
        <div className="flex-1 p-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Code Reading Eye-Tracker Analysis</CardTitle>
            </CardHeader>
            <CardContent className="h-full pb-4">
              <div className="relative w-full h-full max-w-4xl mx-auto">
                <canvas
                  ref={canvasRef}
                  width={900}
                  height={700}
                  className="absolute inset-0 border rounded-lg"
                  style={{ width: '100%', height: 'auto', maxHeight: '100%' }}
                />
                <canvas
                  ref={heatmapCanvasRef}
                  width={900}
                  height={700}
                  className="absolute inset-0 border rounded-lg pointer-events-none"
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    maxHeight: '100%',
                    opacity: showHeatmap ? 1 : 0
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control panel */}
        <div className="w-96 p-4 bg-[rgba(66,32,32,0)]">
          <Tabs defaultValue="controls" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="controls">
                <Eye className="w-4 h-4 mr-1" />
                Controls
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <BarChart3 className="w-4 h-4 mr-1" />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="patterns">
                <Code className="w-4 h-4 mr-1" />
                Patterns
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="controls" className="space-y-4 mt-4">
            {/* Playback controls */}
            <Card>
              <CardHeader>
                <CardTitle>Playback Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleSkipBack}>
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button onClick={handlePlayPause}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSkipForward}>
                    <SkipForward className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">Timeline</label>
                  <Slider
                    value={[currentTime]}
                    onValueChange={(value) => setCurrentTime(value[0])}
                    max={totalDuration}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(currentTime)}ms</span>
                    <span>{totalDuration}ms</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">Speed: {playbackSpeed[0]}x</label>
                  <Slider
                    value={playbackSpeed}
                    onValueChange={setPlaybackSpeed}
                    min={0.25}
                    max={3}
                    step={0.25}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Visualization options */}
            <Card>
              <CardHeader>
                <CardTitle>Visualization Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Show Fixations</label>
                  <Switch
                    checked={showFixations}
                    onCheckedChange={setShowFixations}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Show Gaze Path</label>
                  <Switch
                    checked={showGazePath}
                    onCheckedChange={setShowGazePath}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Show Heatmap</label>
                  <Switch
                    checked={showHeatmap}
                    onCheckedChange={setShowHeatmap}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Code Reading Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Code Reading Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Fixations:</span>
                  <Badge variant="secondary">{totalFixations}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg. Fixation:</span>
                  <Badge variant="secondary">{Math.round(averageDuration)}ms</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Longest Fixation:</span>
                  <Badge variant="secondary">{longestFixation}ms</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Function Focus:</span>
                  <Badge variant="outline">68%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Loop Analysis:</span>
                  <Badge variant="outline">24%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Comments Read:</span>
                  <Badge variant="outline">8%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Current Fixation:</span>
                  <Badge variant={currentFixation ? "default" : "outline"}>
                    {currentFixation ? `#${gazeData.fixations.indexOf(currentFixation) + 1}` : 'None'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Code Reading Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Reading Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Code Fixation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-blue-500"></div>
                  <span className="text-sm">Reading Path</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-yellow-500 rounded-full"></div>
                  <span className="text-sm">Active Reading</span>
                </div>
                <div className="text-xs text-muted-foreground mt-3 space-y-1">
                  <p><strong>Patterns observed:</strong></p>
                  <p>• Linear reading of function signature</p>
                  <p>• Careful analysis of loop conditions</p>
                  <p>• Quick scanning of variable names</p>
                  <p>• Extended focus on complex logic</p>
                </div>
              </CardContent>
            </Card>
            
            </TabsContent>
            
            <TabsContent value="analysis" className="mt-4">
              <CodeAnalysisPanel currentTime={currentTime} totalDuration={totalDuration} />
            </TabsContent>
            
            <TabsContent value="patterns" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Programming Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Sequential Reading Pattern</p>
                        <p className="text-xs text-muted-foreground">
                          Developer follows logical flow from function declaration to implementation
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Loop Comprehension</p>
                        <p className="text-xs text-muted-foreground">
                          Extended fixation on loop conditions indicates careful analysis of iteration logic
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Variable Tracking</p>
                        <p className="text-xs text-muted-foreground">
                          Quick scans of variable names suggest good mental model of data flow
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium">Comment Integration</p>
                        <p className="text-xs text-muted-foreground">
                          Moderate attention to comments shows balance between code and documentation
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        • Consider adding more inline comments for complex logic
                      </p>
                      <p className="text-xs text-muted-foreground">
                        • Function signature shows good readability
                      </p>
                      <p className="text-xs text-muted-foreground">
                        • Variable naming promotes efficient scanning
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
          </Tabs>
        </div>
        </>
        )}
      </div>
    </div>
  );
}