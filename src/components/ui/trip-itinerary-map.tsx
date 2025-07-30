import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from './button';
import { MapPin, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProgramDay {
  day: number;
  location: string;
  activities: string;
}

interface TripItineraryMapProps {
  program: ProgramDay[];
  tripTitle?: string;
  className?: string;
}

export function TripItineraryMap({ program, tripTitle, className = "" }: TripItineraryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch Mapbox token from Supabase secrets
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          setError('Unable to load map. Please contact administrator.');
          setIsLoading(false);
          return;
        }
        
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError('Map token not configured. Please contact administrator.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setError('Unable to load map. Please contact administrator.');
        setIsLoading(false);
      }
    };

    fetchMapboxToken();
  }, []);

  // Geocode locations and initialize map
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || map.current) return;

    const initializeMap = async () => {
      try {
        mapboxgl.accessToken = mapboxToken;
        
        // Create map
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [0, 20], // Default center
          zoom: 2,
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Wait for map to load
        map.current.on('load', async () => {
          // Geocode locations and add markers
          const coordinates: [number, number][] = [];
          
          for (let i = 0; i < program.length; i++) {
            const day = program[i];
            if (!day.location) continue;

            try {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(day.location)}.json?access_token=${mapboxToken}&limit=1`
              );
              
              if (response.ok) {
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                  const [lng, lat] = data.features[0].center;
                  coordinates.push([lng, lat]);

                  // Create custom marker element
                  const markerElement = document.createElement('div');
                  markerElement.className = 'custom-marker';
                  markerElement.innerHTML = `
                    <div style="
                      background: #3b82f6;
                      color: white;
                      border-radius: 50%;
                      width: 32px;
                      height: 32px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-weight: bold;
                      font-size: 14px;
                      border: 3px solid white;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">${day.day}</div>
                  `;

                  // Create popup content
                  const popupContent = `
                    <div style="font-family: sans-serif; max-width: 250px;">
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
                        Day ${day.day}: ${day.location}
                      </h3>
                      <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">
                        ${day.activities || 'No activities specified'}
                      </p>
                    </div>
                  `;

                  // Add marker with popup
                  new mapboxgl.Marker(markerElement)
                    .setLngLat([lng, lat])
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
                    .addTo(map.current!);
                }
              }
            } catch (error) {
              console.error(`Error geocoding location "${day.location}":`, error);
            }
          }

          // Fit map to show all markers
          if (coordinates.length > 0) {
            if (coordinates.length === 1) {
              map.current!.setCenter(coordinates[0]);
              map.current!.setZoom(10);
            } else {
              const bounds = new mapboxgl.LngLatBounds();
              coordinates.forEach(coord => bounds.extend(coord));
              map.current!.fitBounds(bounds, { padding: 50 });
            }
          }

          setIsLoading(false);
        });

      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Failed to initialize map');
        setIsLoading(false);
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken, program]);

  const resetView = () => {
    if (!map.current) return;
    
    // Re-fit bounds to show all markers
    const markers = document.querySelectorAll('.custom-marker');
    if (markers.length > 0) {
      map.current.setCenter([0, 20]);
      map.current.setZoom(2);
    }
  };

  if (error) {
    return (
      <div className={`relative bg-muted rounded-lg p-8 text-center ${className}`}>
        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Map Unavailable</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (program.filter(day => day.location).length === 0) {
    return (
      <div className={`relative bg-muted rounded-lg p-8 text-center ${className}`}>
        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Locations Available</h3>
        <p className="text-muted-foreground">
          Add locations to the day-by-day program to see them visualized on the map.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative bg-white rounded-lg overflow-hidden border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Trip Itinerary Map</h3>
            {tripTitle && (
              <p className="text-sm text-muted-foreground">{tripTitle}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-96">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow"></div>
            <span>Day location</span>
          </div>
          <span>•</span>
          <span>Click markers for details</span>
        </div>
      </div>
    </div>
  );
}