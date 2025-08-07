import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Save, 
  Copy, 
  Star, 
  Download, 
  Upload,
  Search,
  Filter,
  Plus
} from 'lucide-react';

interface TripTemplate {
  id: string;
  name: string;
  category: 'destination' | 'theme' | 'duration' | 'custom';
  destination?: string;
  theme?: string;
  template_data: any;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

interface TripTemplateManagerProps {
  onApplyTemplate?: (templateData: any) => void;
  currentTripData?: any;
  className?: string;
}

export function TripTemplateManager({ 
  onApplyTemplate, 
  currentTripData,
  className 
}: TripTemplateManagerProps) {
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'custom' as const,
    destination: '',
    theme: '',
    is_public: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trip_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as TripTemplate[]);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!newTemplate.name.trim() || !currentTripData) {
      toast({
        title: "Missing Information",
        description: "Please provide a template name and ensure you have trip data to save",
        variant: "destructive",
      });
      return;
    }

    try {
      const templateData = {
        ...newTemplate,
        template_data: {
          ...currentTripData,
          saved_at: new Date().toISOString()
        },
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('trip_templates')
        .insert([templateData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template saved successfully!",
      });

      setSaveDialogOpen(false);
      setNewTemplate({
        name: '',
        category: 'custom',
        destination: '',
        theme: '',
        is_public: false
      });
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const applyTemplate = async (template: TripTemplate) => {
    try {
      // Update usage count
      await supabase
        .from('trip_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id);

      if (onApplyTemplate) {
        onApplyTemplate(template.template_data);
      }

      toast({
        title: "Template Applied",
        description: `"${template.name}" template has been applied to your trip`,
      });
    } catch (error: any) {
      console.error('Error applying template:', error);
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive",
      });
    }
  };

  const exportTemplate = (template: TripTemplate) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${template.name.replace(/\s+/g, '_')}_template.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const template = JSON.parse(e.target?.result as string);
        
        // Remove id and timestamps for import
        const { id, created_at, updated_at, ...templateData } = template;
        
        const { error } = await supabase
          .from('trip_templates')
          .insert([{
            ...templateData,
            name: `${template.name} (Imported)`,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Template imported successfully!",
        });

        fetchTemplates();
      } catch (error: any) {
        console.error('Error importing template:', error);
        toast({
          title: "Error",
          description: "Failed to import template. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.theme?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'destination': return 'bg-blue-500';
      case 'theme': return 'bg-green-500';
      case 'duration': return 'bg-purple-500';
      case 'custom': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Trip Templates
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!currentTripData}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Trip Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Template name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Select 
                    value={newTemplate.category} 
                    onValueChange={(value: any) => setNewTemplate(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="destination">Destination-based</SelectItem>
                      <SelectItem value="theme">Theme-based</SelectItem>
                      <SelectItem value="duration">Duration-based</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Destination (optional)"
                    value={newTemplate.destination}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, destination: e.target.value }))}
                  />
                  <Input
                    placeholder="Theme (optional)"
                    value={newTemplate.theme}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, theme: e.target.value }))}
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="public"
                      checked={newTemplate.is_public}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, is_public: e.target.checked }))}
                    />
                    <label htmlFor="public" className="text-sm">Make template public</label>
                  </div>
                  <Button onClick={saveTemplate} className="w-full">
                    Save Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  Import
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importTemplate}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="destination">Destination</SelectItem>
              <SelectItem value="theme">Theme</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-80">
          {loading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : filteredTemplates.length > 0 ? (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge 
                            variant="secondary" 
                            className={`${getCategoryColor(template.category)} text-white text-xs`}
                          >
                            {template.category}
                          </Badge>
                          {template.is_public && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          )}
                        </div>
                        
                        {(template.destination || template.theme) && (
                          <div className="text-sm text-muted-foreground mb-2">
                            {template.destination && `📍 ${template.destination}`}
                            {template.destination && template.theme && ' • '}
                            {template.theme && `🎯 ${template.theme}`}
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Used {template.usage_count} times
                        </div>
                      </div>

                      <div className="flex gap-1 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyTemplate(template)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Use
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportTemplate(template)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || categoryFilter !== 'all' 
                ? 'No templates match your filters' 
                : 'No templates available'}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}