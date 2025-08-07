import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronDown, 
  Calendar,
  MapPin,
  DollarSign,
  Star,
  Users,
  Clock,
  Mountain,
  Utensils,
  Heart,
  Compass
} from "lucide-react";

interface FilterState {
  searchQuery: string;
  themes: string[];
  destinations: string[];
  priceRange: [number, number];
  minRating: number;
  groupSize: [number, number];
  duration: string;
  difficulty: string[];
  dates: {
    from?: Date;
    to?: Date;
  };
}

interface SearchFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  resultsCount: number;
  className?: string;
}

const themes = [
  { value: "adventure", label: "Adventure", icon: Mountain },
  { value: "culinary", label: "Culinary", icon: Utensils },
  { value: "wellness", label: "Wellness", icon: Heart },
  { value: "cultural", label: "Cultural", icon: Compass },
  { value: "sports", label: "Sports", icon: Users },
];

const destinations = [
  { value: "asia", label: "Asia", count: 12 },
  { value: "europe", label: "Europe", count: 8 },
  { value: "africa", label: "Africa", count: 5 },
  { value: "americas", label: "Americas", count: 7 },
  { value: "oceania", label: "Oceania", count: 3 },
];

const difficulties = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export function SearchFilters({ filters, onFiltersChange, resultsCount, className }: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    themes: true,
    destinations: true,
    difficulty: false,
  });

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleTheme = (theme: string) => {
    const newThemes = filters.themes.includes(theme)
      ? filters.themes.filter(t => t !== theme)
      : [...filters.themes, theme];
    updateFilters({ themes: newThemes });
  };

  const toggleDestination = (destination: string) => {
    const newDestinations = filters.destinations.includes(destination)
      ? filters.destinations.filter(d => d !== destination)
      : [...filters.destinations, destination];
    updateFilters({ destinations: newDestinations });
  };

  const toggleDifficulty = (difficulty: string) => {
    const newDifficulties = filters.difficulty.includes(difficulty)
      ? filters.difficulty.filter(d => d !== difficulty)
      : [...filters.difficulty, difficulty];
    updateFilters({ difficulty: newDifficulties });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: "",
      themes: [],
      destinations: [],
      priceRange: [0, 10000],
      minRating: 0,
      groupSize: [1, 50],
      duration: "any",
      difficulty: [],
      dates: {},
    });
  };

  const activeFiltersCount = [
    filters.searchQuery,
    ...filters.themes,
    ...filters.destinations,
    ...filters.difficulty,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 10000,
    filters.minRating > 0,
    filters.groupSize[0] > 1 || filters.groupSize[1] < 50,
    filters.duration !== "any",
  ].filter(Boolean).length;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className={className}>
      {/* Main Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search destinations, activities, or senseis..."
          className="pl-12 pr-12 h-12 text-lg bg-card shadow-sm border-2 border-muted focus:border-primary"
          value={filters.searchQuery}
          onChange={(e) => updateFilters({ searchQuery: e.target.value })}
        />
        {filters.searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => updateFilters({ searchQuery: "" })}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isSelected = filters.themes.includes(theme.value);
          return (
            <Button
              key={theme.value}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTheme(theme.value)}
              className="animate-fade-in"
            >
              <Icon className="h-4 w-4 mr-2" />
              {theme.label}
            </Button>
          );
        })}
      </div>

      {/* Results Count & Advanced Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <span>{resultsCount} adventures found</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleContent className="space-y-6 animate-accordion-down">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                Filter Your Adventure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Destinations */}
              <Collapsible
                open={expandedSections.destinations}
                onOpenChange={() => toggleSection('destinations')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 font-semibold">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Destinations
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.destinations ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2">
                  {destinations.map((destination) => (
                    <div key={destination.value} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={destination.value}
                          checked={filters.destinations.includes(destination.value)}
                          onCheckedChange={() => toggleDestination(destination.value)}
                        />
                        <Label htmlFor={destination.value} className="cursor-pointer">
                          {destination.label}
                        </Label>
                      </div>
                      <span className="text-sm text-muted-foreground">({destination.count})</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Price Range */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-semibold">
                  <DollarSign className="h-4 w-4" />
                  Price Range
                </Label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                  max={10000}
                  min={0}
                  step={250}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>${filters.priceRange[0].toLocaleString()}</span>
                  <span>${filters.priceRange[1].toLocaleString()}</span>
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-semibold">
                  <Star className="h-4 w-4" />
                  Minimum Rating
                </Label>
                <Slider
                  value={[filters.minRating]}
                  onValueChange={(value) => updateFilters({ minRating: value[0] })}
                  max={5}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
                <div className="text-sm text-muted-foreground">
                  {filters.minRating}+ stars
                </div>
              </div>

              {/* Group Size */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4" />
                  Group Size
                </Label>
                <Slider
                  value={filters.groupSize}
                  onValueChange={(value) => updateFilters({ groupSize: value as [number, number] })}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{filters.groupSize[0]} people</span>
                  <span>{filters.groupSize[1]} people</span>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4" />
                  Trip Duration
                </Label>
                <Select value={filters.duration} onValueChange={(value) => updateFilters({ duration: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any duration</SelectItem>
                    <SelectItem value="1-3">1-3 days</SelectItem>
                    <SelectItem value="4-7">4-7 days</SelectItem>
                    <SelectItem value="8-14">1-2 weeks</SelectItem>
                    <SelectItem value="15+">2+ weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <Collapsible
                open={expandedSections.difficulty}
                onOpenChange={() => toggleSection('difficulty')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 font-semibold">
                    <div className="flex items-center gap-2">
                      <Mountain className="h-4 w-4" />
                      Difficulty Level
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.difficulty ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2">
                  {difficulties.map((difficulty) => (
                    <div key={difficulty.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={difficulty.value}
                        checked={filters.difficulty.includes(difficulty.value)}
                        onCheckedChange={() => toggleDifficulty(difficulty.value)}
                      />
                      <Label htmlFor={difficulty.value} className="cursor-pointer">
                        {difficulty.label}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters ({activeFiltersCount})
                </Button>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {filters.searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.searchQuery}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ searchQuery: "" })}
              />
            </Badge>
          )}
          {filters.themes.map((theme) => (
            <Badge key={theme} variant="secondary" className="gap-1">
              {themes.find(t => t.value === theme)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => toggleTheme(theme)}
              />
            </Badge>
          ))}
          {filters.destinations.map((destination) => (
            <Badge key={destination} variant="secondary" className="gap-1">
              {destinations.find(d => d.value === destination)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => toggleDestination(destination)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}