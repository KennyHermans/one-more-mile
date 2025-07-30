import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface ThemeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  image: string;
  link: string;
}

export function ThemeCard({ title, description, icon: Icon, image, link }: ThemeCardProps) {
  return (
    <Card className="group hover:shadow-xl transition-all duration-500 overflow-hidden transform hover:-translate-y-2 animate-scale-in">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white transform transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-8 w-8 mb-2" />
        </div>
      </div>
      
      <CardHeader>
        <CardTitle className="font-serif text-xl text-foreground group-hover:text-primary transition-colors duration-300">{title}</CardTitle>
        <CardDescription className="font-sans leading-relaxed">{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <Button asChild variant="outline" className="w-full font-sans font-medium transition-all duration-300 hover:scale-105">
          <Link to={link}>Explore {title}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}