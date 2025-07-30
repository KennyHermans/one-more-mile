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
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <Icon className="h-8 w-8 mb-2" />
        </div>
      </div>
      
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link to={link}>Explore {title}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}