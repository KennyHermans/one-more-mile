import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Link } from "react-router-dom";
import { MapPin, Users, Calendar } from "lucide-react";

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
}

export function FeaturedTripCard({ 
  id, title, destination, description, price, dates, groupSize, sensei, image, theme 
}: FeaturedTripCardProps) {
  return (
    <Card className="group hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-1 animate-scale-in">
      <div className="relative h-64 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-4 left-4">
          <Badge variant="secondary" className="bg-white/90 text-primary">
            {theme}
          </Badge>
        </div>
        <div className="absolute bottom-4 left-4 text-white">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">{destination}</span>
          </div>
        </div>
      </div>
      
      <CardHeader>
        <CardTitle className="font-serif text-xl text-foreground group-hover:text-primary transition-colors duration-300">
          {title}
        </CardTitle>
        <CardDescription className="font-sans line-clamp-2 leading-relaxed">{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 font-sans">
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
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Led by Sensei {sensei}</p>
            <p className="text-lg font-bold text-primary">{price}</p>
          </div>
          <Button asChild className="font-sans font-medium transition-all duration-300 hover:scale-105">
            <Link to={`/trip/${id}`}>Learn More</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}