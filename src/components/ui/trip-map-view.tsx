import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, List, MapPin, Star, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { FeaturedTripCard } from "@/components/ui/featured-trip-card";

import { TripListItem } from '@/types/trip';

interface TripWithCoordinates extends TripListItem {
  coordinates?: [number, number]; // [lat, lng]
}

interface TripMapViewProps {
  trips: TripListItem[];
  className?: string;
}

// Destination coordinates - in production, get from trip data or geocoding service
const destinationCoordinates: Record<string, [number, number]> = {
  "nepal": [28.3949, 84.1240],
  "italy": [41.8719, 12.5674],
  "switzerland": [46.8182, 8.2275],
  "peru": [-9.1900, -75.0152],
  "japan": [36.2048, 138.2529],
  "thailand": [15.8700, 100.9925],
  "morocco": [31.7917, -7.0926],
  "costa rica": [9.7489, -83.7534],
  "tibet": [29.6520, 91.1320],
  "iceland": [64.9631, -19.0208],
  "norway": [60.4720, 8.4689],
  "chile": [-35.6751, -71.5430],
  "india": [20.5937, 78.9629],
  "vietnam": [14.0583, 108.2772],
  "cambodia": [12.5657, 104.9910],
  "laos": [19.8563, 102.4955],
  "myanmar": [21.9162, 95.9560],
  "bhutan": [27.5142, 90.4336],
  "sri lanka": [7.8731, 80.7718],
  "mongolia": [46.8625, 103.8467]
};

export function TripMapView({ trips, className }: TripMapViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedTrip, setSelectedTrip] = useState<TripWithCoordinates | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Add coordinates to trips based on destination
  const tripsWithCoordinates: TripWithCoordinates[] = trips.map(trip => ({
    ...trip,
    coordinates: destinationCoordinates[trip.destination.toLowerCase()] || [0, 0] as [number, number]
  }));

  const MapMarker = ({ trip, isSelected }: { trip: TripWithCoordinates; isSelected: boolean }) => (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-200 ${
        isSelected ? 'scale-110 z-10' : 'hover:scale-105'
      }`}
      style={{
        left: `${((trip.coordinates?.[1] || 0) + 180) * (100 / 360)}%`,
        top: `${50 - ((trip.coordinates?.[0] || 0) * (100 / 180))}%`,
      }}
      onClick={() => setSelectedTrip(trip)}
    >
      <div className={`relative ${isSelected ? 'animate-pulse' : ''}`}>
        <MapPin 
          className={`h-8 w-8 ${
            isSelected 
              ? 'text-primary fill-primary' 
              : 'text-red-500 fill-red-500 hover:text-primary hover:fill-primary'
          } transition-colors`} 
        />
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-current rounded-full opacity-30"></div>
      </div>
      
      {/* Price badge */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full px-2 py-1 shadow-lg border">
        <span className="text-xs font-semibold">{trip.price}</span>
      </div>
    </div>
  );

  const TripCard = ({ trip, compact = false }: { trip: TripWithCoordinates; compact?: boolean }) => (
    <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${compact ? 'mb-2' : 'mb-4'}`}>
      <div className={`${compact ? 'flex' : 'block'}`}>
        <div className={`${compact ? 'w-20 h-20' : 'h-48'} relative overflow-hidden`}>
          <img 
            src={trip.image_url} 
            alt={trip.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              {trip.theme}
            </Badge>
          </div>
        </div>
        
        <CardContent className={`${compact ? 'flex-1 p-3' : 'p-4'}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-lg'} line-clamp-1`}>
              {trip.title}
            </h3>
            <div className="flex items-center gap-1 text-yellow-500">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-xs">{trip.rating}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="text-xs">{trip.destination}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span className={`font-bold ${compact ? 'text-sm' : 'text-lg'}`}>
                {trip.price}
              </span>
            </div>
          </div>
          
          {!compact && (
            <div className="mt-3">
              <Button asChild size="sm" className="w-full">
                <Link to={`/trip/${trip.id}`}>
                  View Details
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );

  return (
    <div className={className}>
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-bold">
          {trips.length} Adventures Found
        </h2>
        
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className="gap-2"
          >
            <Map className="h-4 w-4" />
            Map
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* List View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <FeaturedTripCard 
              key={trip.id}
              id={trip.id}
              title={trip.title}
              destination={trip.destination}
              description={trip.title} // Using title as fallback for description
              price={trip.price}
              dates={trip.dates}
              groupSize={`${trip.max_participants} people max`} // Constructed from max_participants
              sensei={trip.sensei_name}
              image={trip.image_url}
              theme={trip.theme}
              current_participants={trip.current_participants || 0}
              max_participants={trip.max_participants}
              difficulty_level={trip.difficulty_level}
              duration_days={undefined} // Not available in TripListItem
              rating={trip.rating || 0}
              review_count={0} // Not available in TripListItem
              sensei_image={undefined} // Not available in TripListItem
              sensei_specialties={[]} // Not available in TripListItem
              sensei_location={undefined} // Not available in TripListItem
              sensei_id={trip.sensei_id} // Now passing sensei_id from TripListItem
            />
          ))}
        </div>
      ) : (
        /* Map View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Map Container */}
          <div className="lg:col-span-2 relative">
            <div 
              ref={mapRef}
              className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100 rounded-lg overflow-hidden relative"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e0e7ff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {/* World Map Outline - Simple SVG */}
              <svg 
                className="absolute inset-0 w-full h-full opacity-20" 
                viewBox="0 0 1000 500" 
                preserveAspectRatio="xMidYMid slice"
              >
                <path 
                  d="M150,100 Q200,80 300,120 T500,100 Q600,110 700,130 T850,120 L850,400 Q800,380 700,390 T500,400 Q400,390 300,380 T150,400 Z" 
                  fill="rgba(34,197,94,0.2)" 
                  stroke="rgba(34,197,94,0.3)" 
                  strokeWidth="2"
                />
              </svg>
              
              {/* Trip Markers */}
              {tripsWithCoordinates.map((trip) => (
                <MapMarker 
                  key={trip.id} 
                  trip={trip} 
                  isSelected={selectedTrip?.id === trip.id} 
                />
              ))}
              
              {/* Map Controls */}
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2">
                <div className="text-xs text-muted-foreground">Interactive Map View</div>
                <div className="text-xs text-muted-foreground">Click markers for details</div>
              </div>
            </div>
          </div>
          
          {/* Trip List Sidebar */}
          <div className="space-y-4 overflow-y-auto max-h-[600px]">
            <h3 className="font-semibold text-lg sticky top-0 bg-background p-2">
              Available Trips
            </h3>
            {tripsWithCoordinates.map((trip) => (
              <div
                key={trip.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedTrip?.id === trip.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedTrip(trip)}
              >
                <TripCard trip={trip} compact />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Trip Details Modal */}
      {selectedTrip && viewMode === 'map' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="relative">
              <img 
                src={selectedTrip.image_url} 
                alt={selectedTrip.title}
                className="w-full h-48 object-cover"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 bg-white/90"
                onClick={() => setSelectedTrip(null)}
              >
                ×
              </Button>
            </div>
            
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-serif text-xl font-bold mb-2">{selectedTrip.title}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedTrip.destination}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{selectedTrip.price}</div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{selectedTrip.rating}</span>
                  </div>
                </div>
              </div>
              
              <Badge className="mb-4">{selectedTrip.theme}</Badge>
              
              <Button asChild className="w-full">
                <Link to={`/trip/${selectedTrip.id}`}>
                  View Full Details
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}