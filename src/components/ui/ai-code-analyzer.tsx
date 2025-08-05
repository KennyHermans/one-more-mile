import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/lib/error-handler';
import { 
  Brain, 
  Code, 
  Shield, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  FileText,
  Upload,
  Sparkles,
  TrendingUp,
  Target
} from 'lucide-react';

interface CodeSuggestion {
  type: 'error' | 'warning' | 'suggestion' | 'improvement';
  category: string;
  line?: number;
  title: string;
  description: string;
  suggestion: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  codeExample?: string;
}

interface AnalysisResult {
  healthScore: number;
  summary: string;
  suggestions: CodeSuggestion[];
}

export function AICodeAnalyzer() {
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [analysisType, setAnalysisType] = useState<'security' | 'performance' | 'quality' | 'comprehensive'>('comprehensive');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const analyzeCode = async () => {
    if (!code.trim() || !fileName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both code and filename",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-code-analyzer', {
        body: {
          code: code.trim(),
          fileName: fileName.trim(),
          analysisType
        }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Analysis Complete",
        description: `Code analysis finished with health score: ${data.healthScore}/10`,
      });

    } catch (error) {
      handleError(error, {
        component: 'AICodeAnalyzer',
        action: 'analyzeCode'
      }, true, "Failed to analyze code");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Shield className="h-4 w-4" />;
      case 'performance': return <Zap className="h-4 w-4" />;
      case 'quality': return <Code className="h-4 w-4" />;
      case 'accessibility': return <Target className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Code Analyzer
          </CardTitle>
          <CardDescription>
            Analyze your code for security vulnerabilities, performance issues, and quality improvements using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">File Name</Label>
              <Input
                id="fileName"
                placeholder="e.g., component.tsx"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="analysisType">Analysis Type</Label>
              <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive Analysis</SelectItem>
                  <SelectItem value="security">Security Focus</SelectItem>
                  <SelectItem value="performance">Performance Focus</SelectItem>
                  <SelectItem value="quality">Code Quality Focus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code to Analyze</Label>
            <Textarea
              id="code"
              placeholder="Paste your code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <Button 
            onClick={analyzeCode} 
            disabled={isAnalyzing || !code.trim() || !fileName.trim()}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                Analyzing Code...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Analyze Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Analysis Results</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className={`text-lg font-bold ${getHealthScoreColor(result.healthScore)}`}>
                  {result.healthScore}/10
                </span>
              </div>
            </CardTitle>
            <CardDescription>{result.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Health Score</span>
                  <span className={getHealthScoreColor(result.healthScore)}>
                    {result.healthScore}/10
                  </span>
                </div>
                <Progress value={result.healthScore * 10} className="h-2" />
              </div>

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All ({result.suggestions.length})</TabsTrigger>
                  <TabsTrigger value="critical">
                    Critical ({result.suggestions.filter(s => s.severity === 'critical').length})
                  </TabsTrigger>
                  <TabsTrigger value="high">
                    High ({result.suggestions.filter(s => s.severity === 'high').length})
                  </TabsTrigger>
                  <TabsTrigger value="medium">
                    Medium ({result.suggestions.filter(s => s.severity === 'medium').length})
                  </TabsTrigger>
                  <TabsTrigger value="low">
                    Low ({result.suggestions.filter(s => s.severity === 'low').length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <ScrollArea className="h-[600px] w-full">
                    <div className="space-y-3">
                      {result.suggestions.map((suggestion, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(suggestion.category)}
                                <h4 className="font-semibold">{suggestion.title}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                {getSeverityIcon(suggestion.severity)}
                                <Badge variant={getSeverityColor(suggestion.severity) as any}>
                                  {suggestion.severity}
                                </Badge>
                              </div>
                            </div>
                            
                            {suggestion.line && (
                              <Badge variant="outline" className="text-xs">
                                Line {suggestion.line}
                              </Badge>
                            )}
                            
                            <p className="text-sm text-muted-foreground">
                              {suggestion.description}
                            </p>
                            
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm font-medium mb-2">💡 Suggestion:</p>
                              <p className="text-sm">{suggestion.suggestion}</p>
                            </div>
                            
                            {suggestion.codeExample && (
                              <div className="bg-background border rounded-lg p-3">
                                <p className="text-sm font-medium mb-2">📝 Example:</p>
                                <pre className="text-xs overflow-x-auto">
                                  <code>{suggestion.codeExample}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {['critical', 'high', 'medium', 'low'].map(severity => (
                  <TabsContent key={severity} value={severity}>
                    <ScrollArea className="h-[600px] w-full">
                      <div className="space-y-3">
                        {result.suggestions
                          .filter(s => s.severity === severity)
                          .map((suggestion, index) => (
                            <Card key={index} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    {getCategoryIcon(suggestion.category)}
                                    <h4 className="font-semibold">{suggestion.title}</h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getSeverityIcon(suggestion.severity)}
                                    <Badge variant={getSeverityColor(suggestion.severity) as any}>
                                      {suggestion.severity}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {suggestion.line && (
                                  <Badge variant="outline" className="text-xs">
                                    Line {suggestion.line}
                                  </Badge>
                                )}
                                
                                <p className="text-sm text-muted-foreground">
                                  {suggestion.description}
                                </p>
                                
                                <div className="bg-muted p-3 rounded-lg">
                                  <p className="text-sm font-medium mb-2">💡 Suggestion:</p>
                                  <p className="text-sm">{suggestion.suggestion}</p>
                                </div>
                                
                                {suggestion.codeExample && (
                                  <div className="bg-background border rounded-lg p-3">
                                    <p className="text-sm font-medium mb-2">📝 Example:</p>
                                    <pre className="text-xs overflow-x-auto">
                                      <code>{suggestion.codeExample}</code>
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </Card>
                          ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}