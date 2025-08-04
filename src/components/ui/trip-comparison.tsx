import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { ScrollArea } from "./scroll-area";
import { Separator } from "./separator";
import { 
  X, 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  Clock, 
  DollarSign,
  Award,
  CheckCircle,
  XCircle,
  Scale,
  ArrowRight
} from "lucide-react";

import { Trip } from '@/types/trip';

interface TripComparisonProps {
  trips: Trip[];
  onRemoveTrip: (tripId: string) => void;
  onSelectTrip: (tripId: string) => void;
}

export function TripComparison({ trips, onRemoveTrip, onSelectTrip }: TripComparisonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (trips.length === 0) return null;

  const extractPrice = (priceStr: string): number => {
    const match = priceStr.match(/\$?([\d,]+)/);
    return match ? parseInt(match[1].replace(',', '')) : 0;
  };

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'easy':
      case 'beginner':
        return 'secondary';
      case 'moderate':
      case 'intermediate':
        return 'warning';
      case 'hard':
      case 'advanced':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getAvailabilityColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'destructive';
    if (percentage >= 75) return 'warning';
    return 'secondary';
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-6xl mx-auto">
      <Card className="bg-background/95 backdrop-blur-sm border shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-lg">
                Compare Trips ({trips.length})
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="font-sans"
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="font-sans">
                    Detailed Compare
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-7xl h-[90vh]">
                  <DialogHeader>
                    <DialogTitle className="font-serif">Trip Comparison</DialogTitle>
                    <DialogDescription>
                      Compare key features and details across your selected trips
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-full">
                    <DetailedComparison trips={trips} onSelectTrip={onSelectTrip} />
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={`transition-all duration-300 ${isExpanded ? 'pb-6' : 'pb-3'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((trip) => (
              <div key={trip.id} className="relative">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <button
                    onClick={() => onRemoveTrip(trip.id)}
                    className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background rounded-full p-1 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  
                  <div className="relative h-32 overflow-hidden rounded-t-lg">
                    <img 
                      src={trip.image_url} 
                      alt={trip.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="bg-white/90 text-xs">
                        {trip.theme}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-serif font-semibold text-sm line-clamp-2 mb-2">
                      {trip.title}
                    </h3>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-semibold text-primary">{trip.price}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span>{trip.duration_days} days</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Difficulty</span>
                        <Badge variant={getDifficultyColor(trip.difficulty_level) as any} className="text-xs">
                          {trip.difficulty_level}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Availability</span>
                        <Badge variant={getAvailabilityColor(trip.current_participants, trip.max_participants) as any} className="text-xs">
                          {trip.current_participants}/{trip.max_participants}
                        </Badge>
                      </div>
                      
                      {isExpanded && (
                        <>
                          <Separator className="my-2" />
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{trip.destination}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span>{trip.rating.toFixed(1)}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="w-full mt-3 font-sans text-xs"
                      onClick={() => onSelectTrip(trip.id)}
                    >
                      View Details
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailedComparison({ trips, onSelectTrip }: { trips: Trip[]; onSelectTrip: (tripId: string) => void }) {
  const comparisonCategories = [
    {
      title: "Basic Information",
      items: [
        { key: "destination", label: "Destination", render: (trip: Trip) => trip.destination },
        { key: "price", label: "Price", render: (trip: Trip) => trip.price },
        { key: "duration", label: "Duration", render: (trip: Trip) => `${trip.duration_days} days` },
        { key: "difficulty", label: "Difficulty", render: (trip: Trip) => trip.difficulty_level },
        { key: "rating", label: "Rating", render: (trip: Trip) => `${trip.rating.toFixed(1)} ⭐` },
        { key: "theme", label: "Theme", render: (trip: Trip) => trip.theme }
      ]
    },
    {
      title: "Group Details",
      items: [
        { key: "sensei", label: "Sensei", render: (trip: Trip) => trip.sensei_name },
        { key: "group_size", label: "Group Size", render: (trip: Trip) => trip.group_size },
        { key: "availability", label: "Availability", render: (trip: Trip) => `${trip.current_participants}/${trip.max_participants} booked` },
        { key: "dates", label: "Dates", render: (trip: Trip) => trip.dates }
      ]
    },
    {
      title: "Inclusions",
      items: [
        { 
          key: "included", 
          label: "Included", 
          render: (trip: Trip) => (
            <div className="space-y-1">
              {trip.included_amenities.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>{item}</span>
                </div>
              ))}
              {trip.included_amenities.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{trip.included_amenities.length - 3} more
                </span>
              )}
            </div>
          )
        },
        { 
          key: "excluded", 
          label: "Not Included", 
          render: (trip: Trip) => (
            <div className="space-y-1">
              {trip.excluded_items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span>{item}</span>
                </div>
              ))}
              {trip.excluded_items.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{trip.excluded_items.length - 3} more
                </span>
              )}
            </div>
          )
        }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {comparisonCategories.map((category) => (
        <div key={category.title} className="space-y-4">
          <h3 className="font-serif text-lg font-semibold">{category.title}</h3>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b">
              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${trips.length}, 1fr)` }}>
                <div className="font-semibold font-sans">Feature</div>
                {trips.map((trip) => (
                  <div key={trip.id} className="text-center">
                    <div className="font-semibold font-serif text-sm line-clamp-2">
                      {trip.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {category.items.map((item) => (
              <div key={item.key} className="px-4 py-3 border-b last:border-b-0">
                <div className="grid gap-4 items-start" style={{ gridTemplateColumns: `200px repeat(${trips.length}, 1fr)` }}>
                  <div className="font-medium font-sans text-sm">{item.label}</div>
                  {trips.map((trip) => (
                    <div key={trip.id} className="text-sm">
                      {item.render(trip)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        {trips.map((trip) => (
          <Button
            key={trip.id}
            onClick={() => onSelectTrip(trip.id)}
            className="flex-1 min-w-[200px] font-sans"
          >
            Book {trip.title}
          </Button>
        ))}
      </div>
    </div>
  );
}