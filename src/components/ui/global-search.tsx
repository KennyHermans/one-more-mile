import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, BookmarkPlus, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";

interface SearchFilter {
  key: string;
  label: string;
  value: string;
  type: 'status' | 'location' | 'date' | 'category';
}

interface SavedFilter {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter[];
  entityType: string;
}

interface GlobalSearchProps {
  onSearch: (query: string, filters: SearchFilter[], entityType: string) => void;
  entityTypes: Array<{ value: string; label: string; count?: number }>;
  recentSearches?: string[];
  savedFilters?: SavedFilter[];
  onSaveFilter?: (filter: Omit<SavedFilter, 'id'>) => void;
}

export function GlobalSearch({ 
  onSearch, 
  entityTypes, 
  recentSearches = [], 
  savedFilters = [],
  onSaveFilter 
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Quick filter suggestions based on entity type
  const getQuickFilters = (entityType: string): SearchFilter[] => {
    const commonFilters = [
      { key: 'date', label: 'Last 7 days', value: '7d', type: 'date' as const },
      { key: 'date', label: 'Last 30 days', value: '30d', type: 'date' as const },
      { key: 'date', label: 'This year', value: 'year', type: 'date' as const },
    ];

    switch (entityType) {
      case 'applications':
        return [
          { key: 'status', label: 'Pending', value: 'pending', type: 'status' as const },
          { key: 'status', label: 'Approved', value: 'approved', type: 'status' as const },
          { key: 'status', label: 'Rejected', value: 'rejected', type: 'status' as const },
          ...commonFilters
        ];
      case 'trips':
        return [
          { key: 'status', label: 'Active', value: 'active', type: 'status' as const },
          { key: 'status', label: 'Cancelled', value: 'cancelled', type: 'status' as const },
          { key: 'category', label: 'Adventure', value: 'adventure', type: 'category' as const },
          { key: 'category', label: 'Cultural', value: 'cultural', type: 'category' as const },
          ...commonFilters
        ];
      case 'senseis':
        return [
          { key: 'status', label: 'Active', value: 'active', type: 'status' as const },
          { key: 'status', label: 'Offline', value: 'offline', type: 'status' as const },
          { key: 'location', label: 'Japan', value: 'japan', type: 'location' as const },
          { key: 'location', label: 'Europe', value: 'europe', type: 'location' as const },
          ...commonFilters
        ];
      case 'bookings':
        return [
          { key: 'status', label: 'Confirmed', value: 'confirmed', type: 'status' as const },
          { key: 'status', label: 'Pending', value: 'pending', type: 'status' as const },
          { key: 'status', label: 'Cancelled', value: 'cancelled', type: 'status' as const },
          ...commonFilters
        ];
      default:
        return commonFilters;
    }
  };

  const handleSearch = () => {
    onSearch(query, activeFilters, selectedEntity);
    if (query && !recentSearches.includes(query)) {
      // This would typically update recent searches in parent component
    }
    setShowSuggestions(false);
  };

  const addFilter = (filter: SearchFilter) => {
    // Remove existing filter of same type if replacing
    const filtered = activeFilters.filter(f => !(f.key === filter.key && f.value === filter.value));
    setActiveFilters([...filtered, filter]);
    setShowFilters(false);
  };

  const removeFilter = (filterToRemove: SearchFilter) => {
    setActiveFilters(activeFilters.filter(f => 
      !(f.key === filterToRemove.key && f.value === filterToRemove.value)
    ));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setQuery("");
    setSelectedEntity("all");
  };

  const applySavedFilter = (savedFilter: SavedFilter) => {
    setQuery(savedFilter.query);
    setActiveFilters(savedFilter.filters);
    setSelectedEntity(savedFilter.entityType);
    onSearch(savedFilter.query, savedFilter.filters, savedFilter.entityType);
  };

  const saveCurrentFilter = () => {
    if (onSaveFilter) {
      const name = prompt("Enter a name for this filter:");
      if (name) {
        onSaveFilter({
          name,
          query,
          filters: activeFilters,
          entityType: selectedEntity
        });
      }
    }
  };

  // Auto-search on filter change
  useEffect(() => {
    if (activeFilters.length > 0 || query) {
      const debounceTimer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [activeFilters, selectedEntity]);

  const quickFilters = getQuickFilters(selectedEntity);
  const hasActiveFilters = activeFilters.length > 0 || query || selectedEntity !== "all";

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search across all entities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              className="pl-10 pr-4"
            />
            
            {/* Search Suggestions */}
            {showSuggestions && (recentSearches.length > 0 || savedFilters.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                {recentSearches.length > 0 && (
                  <div className="p-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      Recent searches
                    </div>
                    {recentSearches.slice(0, 5).map((search, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                        onClick={() => {
                          setQuery(search);
                          setShowSuggestions(false);
                        }}
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                )}
                
                {savedFilters.length > 0 && (
                  <>
                    {recentSearches.length > 0 && <Separator />}
                    <div className="p-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <BookmarkPlus className="h-3 w-3" />
                        Saved filters
                      </div>
                      {savedFilters.map((filter) => (
                        <button
                          key={filter.id}
                          className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded flex items-center justify-between"
                          onClick={() => {
                            applySavedFilter(filter);
                            setShowSuggestions(false);
                          }}
                        >
                          <span>{filter.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {filter.entityType}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({entityTypes.reduce((sum, type) => sum + (type.count || 0), 0)})</SelectItem>
              {entityTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label} {type.count && `(${type.count})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Quick Filters</h4>
                  {onSaveFilter && hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={saveCurrentFilter}>
                      <BookmarkPlus className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {quickFilters.map((filter, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => addFilter(filter)}
                      className="justify-start text-xs"
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters */}
      {(activeFilters.length > 0 || hasActiveFilters) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filters:</span>
          
          {selectedEntity !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Entity: {entityTypes.find(t => t.value === selectedEntity)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => setSelectedEntity("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {filter.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => removeFilter(filter)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all
            </Button>
          )}
        </div>
      )}
      
      {/* Click outside to close suggestions */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}