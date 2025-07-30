import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from './button';
import { MapPin, RotateCcw, Play, Pause } from 'lucide-react';
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const coordinatesRef = useRef<[number, number][]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

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
          const markers: mapboxgl.Marker[] = [];
          
          // Known coordinates for common Cape Town locations
          const knownLocations: { [key: string]: [number, number] } = {
            "table mountain": [18.4107, -33.9628],
            "lion's head": [18.3984, -33.9370],
            "lions head": [18.3984, -33.9370],
            "camps bay": [18.3782, -33.9511],
            "cape town international airport": [18.5954, -33.9702],
            "university of cape town": [18.4628, -33.9558],
            "stellenbosch": [18.8600, -33.9381],
            "muizenberg": [18.4879, -34.0968],
            "cape town city center": [18.4241, -33.9249],
            "cape town city centre": [18.4241, -33.9249],
            "v&a waterfront": [18.4194, -33.9030],
            "waterfront": [18.4194, -33.9030],
            // More specific matches for the exact trip locations
            "cape town international airport, south africa": [18.5954, -33.9702],
            "table mountain, south africa": [18.4107, -33.9628],
            "camps bay beach, south africa": [18.3782, -33.9511],
            "university of cape town sports science lab, south africa": [18.4628, -33.9558],
            "lion's head peak, south africa": [18.3984, -33.9370],
            "stellenbosch wine region, south africa": [18.8600, -33.9381],
            "muizenberg beach, south africa": [18.4879, -34.0968],
            "cape town city center, south africa": [18.4241, -33.9249]
          };
          
          for (let i = 0; i < program.length; i++) {
            const day = program[i];
            if (!day.location) continue;

            let coordinates_found: [number, number] | null = null;
            
            // First check if we have known coordinates (exact match first, then partial)
            const locationKey = day.location.toLowerCase();
            console.log(`Processing location: "${day.location}" -> "${locationKey}"`);
            
            // Try exact match first
            if (knownLocations[locationKey]) {
              coordinates_found = knownLocations[locationKey];
              console.log(`Found exact match for "${day.location}": [${coordinates_found[0]}, ${coordinates_found[1]}]`);
            } else {
              // Try partial match
              for (const [key, coords] of Object.entries(knownLocations)) {
                if (locationKey.includes(key)) {
                  coordinates_found = coords;
                  console.log(`Found partial match for "${day.location}" using key "${key}": [${coords[0]}, ${coords[1]}]`);
                  break;
                }
              }
            }
            
            // If not found in known locations, try geocoding with improved query
            if (!coordinates_found) {
              console.log(`Geocoding location: "${day.location}"`);
              try {
                // Improve the search query by being more specific about Cape Town
                let searchQuery = day.location;
                if (!searchQuery.toLowerCase().includes('cape town') && !searchQuery.toLowerCase().includes('south africa')) {
                  searchQuery = `${day.location}, Cape Town, South Africa`;
                }
                
                console.log(`Geocoding query: "${searchQuery}"`);
                const response = await fetch(
                  `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxToken}&limit=5&proximity=18.4241,-33.9249`
                );
                
                if (response.ok) {
                  const data = await response.json();
                  console.log(`Geocoding results for "${day.location}":`, data.features?.map(f => ({ name: f.place_name, center: f.center })));
                  
                  if (data.features && data.features.length > 0) {
                    // Find the best match (prefer results near Cape Town)
                    let bestFeature = data.features[0];
                    for (const feature of data.features) {
                      if (feature.place_name.toLowerCase().includes('cape town') || 
                          feature.place_name.toLowerCase().includes('western cape')) {
                        bestFeature = feature;
                        break;
                      }
                    }
                    
                    const [lng, lat] = bestFeature.center;
                    console.log(`Selected coordinates for "${day.location}": [${lng}, ${lat}] from "${bestFeature.place_name}"`);
                    
                    // Validate coordinates are in reasonable range for Cape Town area
                    if (lng >= 18.0 && lng <= 19.5 && lat >= -35.0 && lat <= -33.0) {
                      coordinates_found = [lng, lat];
                    } else {
                      console.warn(`Coordinates [${lng}, ${lat}] for "${day.location}" are outside Cape Town area, rejecting`);
                    }
                  }
                }
              } catch (error) {
                console.error(`Error geocoding location "${day.location}":`, error);
              }
            }
            
            if (coordinates_found) {
              coordinates.push(coordinates_found);

              // Create custom marker element with animation
              const markerElement = document.createElement('div');
              markerElement.className = 'custom-marker';
              markerElement.style.cssText = `
                position: relative;
                cursor: pointer;
                transition: all 0.3s ease;
              `;
              markerElement.innerHTML = `
                <div style="
                  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                  color: white;
                  border-radius: 50%;
                  width: 40px;
                  height: 40px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 16px;
                  border: 3px solid white;
                  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                  transform: scale(0);
                  animation: markerPop 0.6s ease-out ${i * 0.2}s forwards;
                ">${day.day}</div>
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 60px;
                  height: 60px;
                  border: 2px solid #3b82f6;
                  border-radius: 50%;
                  opacity: 0;
                  animation: ripple 2s infinite ${i * 0.2}s;
                "></div>
              `;

              // Add hover effects
              markerElement.addEventListener('mouseenter', () => {
                markerElement.style.transform = 'scale(1.1)';
              });
              markerElement.addEventListener('mouseleave', () => {
                markerElement.style.transform = 'scale(1)';
              });

              // Create popup content
              const popupContent = `
                <div style="font-family: sans-serif; max-width: 280px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #1f2937;">
                    Day ${day.day}: ${day.location}
                  </h3>
                  <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                    ${day.activities || 'No activities specified'}
                  </p>
                </div>
              `;

              // Add marker with popup
              const marker = new mapboxgl.Marker(markerElement)
                .setLngLat(coordinates_found)
                .setPopup(new mapboxgl.Popup({ offset: 25, className: 'custom-popup' }).setHTML(popupContent))
                .addTo(map.current!);
                
              markers.push(marker);
            }
          }

          // Store coordinates and markers for animation
          coordinatesRef.current = coordinates;
          markersRef.current = markers;

          // Add animated route line
          if (coordinates.length > 1) {
            addAnimatedRoute(coordinates);
          }

          // Fit map to show all markers
          if (coordinates.length > 0) {
            if (coordinates.length === 1) {
              map.current!.setCenter(coordinates[0]);
              map.current!.setZoom(10);
            } else {
              const bounds = new mapboxgl.LngLatBounds();
              coordinates.forEach(coord => bounds.extend(coord));
              map.current!.fitBounds(bounds, { padding: 80 });
            }
          }

          // Add custom CSS animations
          addCustomStyles();

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

  // Add animated route between points
  const addAnimatedRoute = (coordinates: [number, number][]) => {
    if (!map.current || coordinates.length < 2) return;

    // Create route line data
    const routeData = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: coordinates
      }
    };

    // Add source for the route
    map.current.addSource('route', {
      type: 'geojson',
      data: routeData
    });

    // Add animated dashed line
    map.current.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 3,
        'line-dasharray': [2, 2],
        'line-opacity': 0.8
      }
    });

    // Add arrow markers along the route
    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i];
      const end = coordinates[i + 1];
      
      // Calculate midpoint
      const midLng = (start[0] + end[0]) / 2;
      const midLat = (start[1] + end[1]) / 2;
      
      // Calculate bearing for arrow direction
      const bearing = Math.atan2(end[1] - start[1], end[0] - start[0]) * (180 / Math.PI);
      
      // Create arrow element
      const arrowElement = document.createElement('div');
      arrowElement.innerHTML = `
        <div style="
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 12px solid #3b82f6;
          transform: rotate(${bearing + 90}deg);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          animation: arrowPulse 2s infinite ease-in-out;
        "></div>
      `;
      
      new mapboxgl.Marker(arrowElement)
        .setLngLat([midLng, midLat])
        .addTo(map.current);
    }

    // Animate the dash line
    let dashOffset = 0;
    const animateDash = () => {
      if (!map.current || !map.current.getLayer('route-line')) return;
      
      dashOffset += 0.5;
      map.current.setPaintProperty('route-line', 'line-dasharray', [2, 2]);
      
      requestAnimationFrame(animateDash);
    };
    animateDash();
  };

  // Add custom CSS styles
  const addCustomStyles = () => {
    if (document.getElementById('mapbox-custom-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mapbox-custom-styles';
    style.textContent = `
      @keyframes markerPop {
        0% { 
          transform: scale(0) rotate(0deg);
          opacity: 0;
        }
        50% { 
          transform: scale(1.2) rotate(180deg);
          opacity: 0.8;
        }
        100% { 
          transform: scale(1) rotate(360deg);
          opacity: 1;
        }
      }
      
      @keyframes ripple {
        0% {
          transform: translate(-50%, -50%) scale(0);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 0;
        }
      }
      
      @keyframes arrowPulse {
        0%, 100% {
          opacity: 0.6;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.2);
        }
      }
      
      .custom-popup .mapboxgl-popup-content {
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        border: 1px solid #e5e7eb;
      }
      
      .custom-popup .mapboxgl-popup-tip {
        border-top-color: #ffffff;
      }
    `;
    document.head.appendChild(style);
  };

  // Journey animation function
  const animateJourney = () => {
    if (!map.current || coordinatesRef.current.length === 0) return;
    
    setIsAnimating(true);
    let step = 0;
    
    const animate = () => {
      if (step >= coordinatesRef.current.length) {
        setIsAnimating(false);
        setCurrentStep(0);
        return;
      }
      
      const coord = coordinatesRef.current[step];
      map.current!.flyTo({
        center: coord,
        zoom: 12,
        duration: 1500,
        essential: true
      });
      
      // Highlight current marker
      markersRef.current.forEach((marker, index) => {
        const element = marker.getElement().querySelector('div');
        if (element) {
          if (index === step) {
            element.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            element.style.transform = 'scale(1.3)';
            element.style.zIndex = '1000';
          } else if (index < step) {
            element.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
            element.style.transform = 'scale(1)';
          } else {
            element.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
            element.style.transform = 'scale(0.8)';
          }
        }
      });
      
      setCurrentStep(step);
      step++;
      
      animationRef.current = setTimeout(animate, 2000);
    };
    
    animate();
  };

  const stopAnimation = () => {
    setIsAnimating(false);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    
    // Reset all markers
    markersRef.current.forEach((marker) => {
      const element = marker.getElement().querySelector('div');
      if (element) {
        element.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        element.style.transform = 'scale(1)';
      }
    });
    
    // Reset view to show all markers
    if (coordinatesRef.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      coordinatesRef.current.forEach(coord => bounds.extend(coord));
      map.current?.fitBounds(bounds, { padding: 80, duration: 1000 });
    }
    
    setCurrentStep(0);
  };

  const resetView = () => {
    if (!map.current) return;
    
    stopAnimation();
    
    // Re-fit bounds to show all markers
    if (coordinatesRef.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      coordinatesRef.current.forEach(coord => bounds.extend(coord));
      map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
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
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Trip Itinerary Map</h3>
            {tripTitle && (
              <p className="text-sm text-muted-foreground">{tripTitle}</p>
            )}
            {isAnimating && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                Showing Day {currentStep + 1} of {coordinatesRef.current.length}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            {coordinatesRef.current.length > 1 && (
              <Button
                variant={isAnimating ? "default" : "outline"}
                size="sm"
                onClick={isAnimating ? stopAnimation : animateJourney}
                disabled={isLoading}
                className="animate-fade-in"
              >
                {isAnimating ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Tour
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play Journey
                  </>
                )}
              </Button>
            )}
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
      <div className="p-4 border-t bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
            <span>Trip locations</span>
          </div>
          <div className="flex items-center space-x-2">
            <div style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '8px solid #3b82f6'
            }}></div>
            <span>Route direction</span>
          </div>
          <span>•</span>
          <span>Click markers for details</span>
          {coordinatesRef.current.length > 1 && (
            <>
              <span>•</span>
              <span className="text-blue-600 font-medium">Use "Play Journey" for guided tour</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}