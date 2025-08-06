import { useState, useEffect, useCallback } from 'react';
import { Input } from './input';
import { Search, X } from 'lucide-react';
import { Button } from './button';
import { performanceMonitor } from '@/lib/performance-monitor';
import { searchCache } from '@/lib/cache-manager';

interface DebouncedSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  minLength?: number;
  enableCaching?: boolean;
  className?: string;
}

export function DebouncedSearch({
  placeholder = "Search...",
  onSearch,
  debounceMs = 300,
  minLength = 2,
  enableCaching = true,
  className,
}: DebouncedSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= minLength) {
      executeSearch(debouncedQuery);
    } else if (debouncedQuery.length === 0) {
      // Clear search results when query is empty
      onSearch('');
    }
  }, [debouncedQuery, minLength, onSearch]);

  const executeSearch = useCallback(async (searchQuery: string) => {
    setIsSearching(true);

    try {
      // Check cache first if enabled
      if (enableCaching) {
        const cachedResults = searchCache.get(searchQuery);
        if (cachedResults) {
          onSearch(searchQuery);
          setIsSearching(false);
          return;
        }
      }

      // Measure search performance
      await performanceMonitor.measureAsyncFunction(
        'search-operation',
        async () => {
          onSearch(searchQuery);
          
          // Cache the search query (the actual results would be cached by the parent component)
          if (enableCaching) {
            searchCache.set(searchQuery, []);
          }
        }
      );
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch, enableCaching]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    onSearch('');
  }, [onSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Show loading state immediately for better UX
    if (value.length >= minLength) {
      setIsSearching(true);
    }
  }, [minLength]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          className="pl-10 pr-10"
        />
        
        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
        
        {/* Clear button */}
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Search info */}
      {query && query.length < minLength && (
        <p className="text-xs text-muted-foreground mt-1">
          Type at least {minLength} characters to search
        </p>
      )}
      
      {debouncedQuery && debouncedQuery.length >= minLength && (
        <p className="text-xs text-muted-foreground mt-1">
          Searching for "{debouncedQuery}"...
        </p>
      )}
    </div>
  );
}