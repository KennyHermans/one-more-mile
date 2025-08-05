import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Badge } from "./badge";
import { Slider } from "./slider";
import { Checkbox } from "./checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronDown, 
  ChevronUp,
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Clock,
  DollarSign,
  Star,
  Mountain,
  Heart,
  Filter,
  Bookmark,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

interface FilterState {
  searchQuery: string;
  themes: string[];
  destinations: string[];
  priceRange: [number, number];
  minRating: number;
  groupSize: string;
  duration: string[];
  difficulty: string[];
  dates: {
    from: Date | undefined;
    to: Date | undefined;
  };
  amenities: string[];
  senseiRating: number;
  availability: string;
}

interface EnhancedSearchFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  resultsCount: number;
  onSavePreset?: (name: string, filters: FilterState) => void;
  savedPresets?: { name: string; filters: FilterState }[];
  onLoadPreset?: (filters: FilterState) => void;
  className?: string;
}

export function EnhancedSearchFilters({ 
  filters, 
  onFiltersChange, 
  resultsCount,
  onSavePreset,
  savedPresets = [],
  onLoadPreset,
  className 
}: EnhancedSearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['themes']);
  const [presetName, setPresetName] = useState("");
  const [showPresetInput, setShowPresetInput] = useState(false);

  const themes = [
    { label: "Adventure", value: "adventure", icon: Mountain, count: 12 },
    { label: "Wellness", value: "wellness", icon: Heart, count: 8 },
    { label: "Cultural", value: "cultural", icon: MapPin, count: 15 },
    { label: "Culinary", value: "culinary", count: 6 },
    { label: "Sports", value: "sports", count: 10 },
    { label: "Photography", value: "photography", count: 5 }
  ];

  const destinations = [
    "Nepal", "Italy", "Japan", "Peru", "Iceland", "Thailand", 
    "Morocco", "New Zealand", "Costa Rica", "Norway"
  ];

  const difficulties = [
    { label: "Easy", value: "easy", color: "secondary" },
    { label: "Moderate", value: "moderate", color: "warning" },
    { label: "Hard", value: "hard", color: "destructive" }
  ];

  const amenities = [
    "All Meals Included", "Accommodation", "Equipment Provided", 
    "Transport", "Guide Services", "Insurance", "Airport Transfers"
  ];

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange(updates);
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

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    updateFilters({ amenities: newAmenities });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const clearAllFilters = () => {
    updateFilters({
      searchQuery: "",
      themes: [],
      destinations: [],
      priceRange: [0, 10000],
      minRating: 0,
      groupSize: "",
      duration: [],
      difficulty: [],
      dates: { from: undefined, to: undefined },
      amenities: [],
      senseiRating: 0,
      availability: ""
    });
  };

  const savePreset = () => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), filters);
      setPresetName("");
      setShowPresetInput(false);
    }
  };

  const activeFiltersCount = 
    filters.themes.length + 
    filters.destinations.length + 
    filters.difficulty.length + 
    filters.amenities.length +
    (filters.searchQuery ? 1 : 0) +
    (filters.groupSize ? 1 : 0) +
    (filters.duration.length > 0 ? 1 : 0) +
    (filters.dates.from ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.senseiRating > 0 ? 1 : 0) +
    (filters.availability ? 1 : 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Bar & Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Main Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for destinations, activities, or themes..."
                value={filters.searchQuery}
                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                className="pl-10 font-sans"
              />
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {themes.slice(0, 4).map((theme) => {
                const Icon = theme.icon;
                return (
                  <Button
                    key={theme.value}
                    variant={filters.themes.includes(theme.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTheme(theme.value)}
                    className="font-sans"
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {theme.label}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {theme.count}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="font-sans"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Advanced Filters
                {showAdvanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2">{activeFiltersCount}</Badge>
                )}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-sans">
                  {resultsCount} adventures found
                </span>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="font-sans"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Presets */}
      {savedPresets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Saved Searches
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {savedPresets.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onLoadPreset?.(preset.filters)}
                  className="font-sans"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Filters */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleContent className="space-y-4">
          {/* Dates */}
          <Card>
            <CardHeader className="pb-3">
              <Collapsible 
                open={expandedSections.includes('dates')} 
                onOpenChange={() => toggleSection('dates')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <CardTitle className="font-serif text-base flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Travel Dates
                    </CardTitle>
                    {expandedSections.includes('dates') ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-sans">Departure Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start font-sans">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dates.from ? format(filters.dates.from, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.dates.from}
                            onSelect={(date) => updateFilters({ 
                              dates: { ...filters.dates, from: date } 
                            })}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="font-sans">Return Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start font-sans">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dates.to ? format(filters.dates.to, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.dates.to}
                            onSelect={(date) => updateFilters({ 
                              dates: { ...filters.dates, to: date } 
                            })}
                            disabled={(date) => 
                              date < new Date() || 
                              (filters.dates.from && date < filters.dates.from)
                            }
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardHeader>
          </Card>

          {/* Price Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Price Range
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                  max={10000}
                  min={0}
                  step={100}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground font-sans">
                  <span>${filters.priceRange[0]}</span>
                  <span>${filters.priceRange[1]}+</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destinations */}
          <Card>
            <CardHeader className="pb-3">
              <Collapsible 
                open={expandedSections.includes('destinations')} 
                onOpenChange={() => toggleSection('destinations')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <CardTitle className="font-serif text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Destinations
                    </CardTitle>
                    {expandedSections.includes('destinations') ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {destinations.map((destination) => (
                      <label key={destination} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={filters.destinations.includes(destination)}
                          onCheckedChange={() => toggleDestination(destination)}
                        />
                        <span className="text-sm font-sans">{destination}</span>
                      </label>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardHeader>
          </Card>

          {/* Difficulty & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-base flex items-center gap-2">
                  <Mountain className="h-4 w-4" />
                  Difficulty
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {difficulties.map((difficulty) => (
                    <label key={difficulty.value} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={filters.difficulty.includes(difficulty.value)}
                        onCheckedChange={() => toggleDifficulty(difficulty.value)}
                      />
                      <Badge variant={difficulty.color as any} className="text-xs">
                        {difficulty.label}
                      </Badge>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select 
                  value={filters.duration[0] || ""} 
                  onValueChange={(value) => updateFilters({ duration: value ? [value] : [] })}
                >
                  <SelectTrigger className="font-sans">
                    <SelectValue placeholder="Any duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any duration</SelectItem>
                    <SelectItem value="1-3">1-3 days</SelectItem>
                    <SelectItem value="4-7">4-7 days</SelectItem>
                    <SelectItem value="8-14">1-2 weeks</SelectItem>
                    <SelectItem value="15+">2+ weeks</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Amenities */}
          <Card>
            <CardHeader className="pb-3">
              <Collapsible 
                open={expandedSections.includes('amenities')} 
                onOpenChange={() => toggleSection('amenities')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <CardTitle className="font-serif text-base flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Included Amenities
                    </CardTitle>
                    {expandedSections.includes('amenities') ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {amenities.map((amenity) => (
                      <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={filters.amenities.includes(amenity)}
                          onCheckedChange={() => toggleAmenity(amenity)}
                        />
                        <span className="text-sm font-sans">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardHeader>
          </Card>

          {/* Save Preset */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {showPresetInput ? (
                  <>
                    <Input
                      placeholder="Preset name..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="font-sans"
                      onKeyPress={(e) => e.key === 'Enter' && savePreset()}
                    />
                    <Button onClick={savePreset} size="sm" disabled={!presetName.trim()} className="font-sans">
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowPresetInput(false)} className="font-sans">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowPresetInput(true)}
                    disabled={activeFiltersCount === 0}
                    className="font-sans"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Save Current Search
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium font-sans">Active filters:</span>
              
              {filters.themes.map((theme) => (
                <Badge key={theme} variant="secondary" className="cursor-pointer" onClick={() => toggleTheme(theme)}>
                  {theme}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              
              {filters.destinations.map((destination) => (
                <Badge key={destination} variant="secondary" className="cursor-pointer" onClick={() => toggleDestination(destination)}>
                  {destination}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              
              {filters.difficulty.map((difficulty) => (
                <Badge key={difficulty} variant="secondary" className="cursor-pointer" onClick={() => toggleDifficulty(difficulty)}>
                  {difficulty}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              
              {filters.searchQuery && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilters({ searchQuery: "" })}>
                  "{filters.searchQuery}"
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}