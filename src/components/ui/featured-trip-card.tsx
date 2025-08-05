import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { MapPin, Users, Calendar, Plus, BarChart3, Star, Clock, Mountain, Heart, Zap, Eye, Award } from "lucide-react";
import { TripListItem } from '@/types/trip';

interface FeaturedTripCardProps {
  id: string;
  title: string;
  destination: string;
  description: string;
  price: string;
  dates: string;
  groupSize: string;
  sensei: string;
  image: string;
  theme: string;
  current_participants?: number;
  max_participants?: number;
  onCompare?: (tripId: string) => void;
  isInComparison?: boolean;
  difficulty_level?: string;
  duration_days?: number;
  rating?: number;
  review_count?: number;
  sensei_image?: string;
  sensei_specialties?: string[];
  sensei_location?: string;
  sensei_id?: string | null;
}

export function FeaturedTripCard({ 
  id, title, destination, description, price, dates, groupSize, sensei, image, theme,
  current_participants = 0, max_participants = 12, onCompare, isInComparison = false,
  difficulty_level, duration_days, rating = 0, review_count = 0, sensei_image, 
  sensei_specialties = [], sensei_location, sensei_id
}: FeaturedTripCardProps) {
  const currentParticipants = current_participants;
  const maxParticipants = max_participants;
  const spotsLeft = maxParticipants - currentParticipants;
  const isFillingFast = spotsLeft <= 3 && spotsLeft > 0;
  const isFull = spotsLeft <= 0;

  const getDifficultyIcon = (level?: string) => {
    if (!level) return null;
    if (level.toLowerCase().includes('easy')) return <Zap className="h-3 w-3 text-green-500" />;
    if (level.toLowerCase().includes('moderate')) return <Mountain className="h-3 w-3 text-yellow-500" />;
    if (level.toLowerCase().includes('challenging')) return <Mountain className="h-3 w-3 text-red-500" />;
    return <Mountain className="h-3 w-3 text-gray-500" />;
  };

  const getDifficultyColor = (level?: string) => {
    if (!level) return 'secondary';
    if (level.toLowerCase().includes('easy')) return 'default';
    if (level.toLowerCase().includes('moderate')) return 'secondary';
    if (level.toLowerCase().includes('challenging')) return 'destructive';
    return 'secondary';
  };

  return (
    <Card className="group hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-1 animate-scale-in">
      <div className="relative h-64 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        
        {/* Top badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-white/90 text-primary backdrop-blur-sm">
            {theme}
          </Badge>
          {difficulty_level && (
            <Badge variant={getDifficultyColor(difficulty_level)} className="bg-white/90 backdrop-blur-sm gap-1">
              {getDifficultyIcon(difficulty_level)}
              {difficulty_level}
            </Badge>
          )}
        </div>

        {/* Top right indicators */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {rating > 0 && (
            <div className="flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{rating}</span>
              {review_count > 0 && <span className="opacity-75">({review_count})</span>}
            </div>
          )}
          {isFillingFast && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              Filling Fast!
            </Badge>
          )}
          {rating >= 4.5 && review_count >= 10 && (
            <Badge className="bg-yellow-500 text-white text-xs">
              <Award className="h-3 w-3 mr-1" />
              Popular
            </Badge>
          )}
        </div>

        {/* Bottom location and duration */}
        <div className="absolute bottom-4 left-4 text-white space-y-1">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">{destination}</span>
          </div>
          {duration_days && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs opacity-90">{duration_days} days</span>
            </div>
          )}
        </div>

        {/* Heart wishlist button */}
        <button className="absolute bottom-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors group/heart">
          <Heart className="h-4 w-4 text-white group-hover/heart:fill-red-500 group-hover/heart:text-red-500 transition-colors" />
        </button>
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-xl text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
          {title}
        </CardTitle>
        <CardDescription className="font-sans line-clamp-2 leading-relaxed text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 font-sans pt-0">
        {/* Trip details row */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{dates}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{groupSize}</span>
          </div>
        </div>
        
        {/* Enhanced Sensei info */}
        {sensei_id ? (
          <Link to={`/senseis/${sensei_id}`} className="block">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer group">
              <Avatar className="h-10 w-10">
                <AvatarImage src={sensei_image} alt={`Sensei ${sensei}`} />
                <AvatarFallback className="text-xs">{sensei.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm group-hover:text-primary transition-colors">Sensei {sensei}</p>
                {sensei_location && (
                  <p className="text-xs text-muted-foreground">{sensei_location}</p>
                )}
                {sensei_specialties.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {sensei_specialties.slice(0, 2).map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs py-0 px-1">
                        {specialty}
                      </Badge>
                    ))}
                    {sensei_specialties.length > 2 && (
                      <span className="text-xs text-muted-foreground">+{sensei_specialties.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" className="p-1 h-auto opacity-60 group-hover:opacity-100 transition-opacity">
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={sensei_image} alt={`Sensei ${sensei}`} />
              <AvatarFallback className="text-xs">{sensei.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Sensei {sensei}</p>
              {sensei_location && (
                <p className="text-xs text-muted-foreground">{sensei_location}</p>
              )}
              {sensei_specialties.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {sensei_specialties.slice(0, 2).map((specialty, index) => (
                    <Badge key={index} variant="outline" className="text-xs py-0 px-1">
                      {specialty}
                    </Badge>
                  ))}
                  {sensei_specialties.length > 2 && (
                    <span className="text-xs text-muted-foreground">+{sensei_specialties.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Availability indicator */}
        {currentParticipants >= 0 && maxParticipants > 0 && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            isFull 
              ? 'bg-red-50 border border-red-200' 
              : isFillingFast 
                ? 'bg-orange-50 border border-orange-200' 
                : 'bg-green-50 border border-green-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isFull ? 'bg-red-500' : isFillingFast ? 'bg-orange-500' : 'bg-green-500'
            }`}></div>
            <span className={`text-sm font-medium ${
              isFull ? 'text-red-700' : isFillingFast ? 'text-orange-700' : 'text-green-700'
            }`}>
              {isFull 
                ? 'Fully booked' 
                : isFillingFast 
                  ? `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left!`
                  : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} available`
              }
            </span>
          </div>
        )}
        
        {/* Price and action buttons */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">{price}</span>
              <span className="text-sm text-muted-foreground">per person</span>
            </div>
            {duration_days && (
              <p className="text-xs text-muted-foreground">
                ~${Math.round(parseInt(price.replace(/\D/g, '')) / duration_days)} per day
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCompare && (
              <Button
                variant={isInComparison ? "default" : "outline"}
                size="sm"
                onClick={() => onCompare(id)}
                className="font-sans"
              >
                {isInComparison ? (
                  <>
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Compare
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Compare
                  </>
                )}
              </Button>
            )}
            <Button asChild className="font-sans font-medium transition-all duration-300 hover:scale-105">
              <Link to={`/trip/${id}`}>
                {isFull ? 'Join Waitlist' : 'More Details'}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}