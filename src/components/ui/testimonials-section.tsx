import { Card, CardContent } from "./card";
import { Button } from "./button";
import { Quote } from "lucide-react";

interface TestimonialProps {
  quote: string;
  author: string;
  trip: string;
  image: string;
}

function TestimonialCard({ quote, author, trip, image }: TestimonialProps) {
  return (
    <Card className="relative overflow-hidden border-0 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-8">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-accent/10 rounded-full">
            <Quote className="h-8 w-8 text-accent" />
          </div>
        </div>
        
        <blockquote className="font-sans text-lg text-center text-muted-foreground mb-6 leading-relaxed italic">
          "{quote}"
        </blockquote>
        
        <div className="flex items-center justify-center space-x-4">
          <img 
            src={image} 
            alt={author}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="text-center">
            <div className="font-sans font-semibold text-foreground">{author}</div>
            <div className="font-sans text-sm text-muted-foreground">{trip}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: "The Nepal trek with Sensei Maya completely changed my perspective on life. Every sunrise felt like a new beginning.",
      author: "Sarah Chen",
      trip: "Himalayan Mindfulness Retreat",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b385?w=100&h=100&fit=crop&crop=face"
    },
    {
      quote: "Learning to cook authentic pasta in Tuscany wasn't just about food - it was about connecting with culture and passion.",
      author: "Marcus Rodriguez", 
      trip: "Italian Culinary Journey",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
    },
    {
      quote: "The wildlife conservation experience in South Africa opened my eyes to our responsibility as global citizens.",
      author: "Emma Thompson",
      trip: "Safari Conservation Adventure",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-secondary/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Stories That Inspire
          </h2>
          <p className="font-sans text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Hear from fellow adventurers who've experienced the transformative power of purposeful travel
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </div>
        
        <div className="text-center">
          <Button asChild size="lg" variant="outline" className="font-sans font-medium">
            <a href="/testimonials">Read More Stories</a>
          </Button>
        </div>
      </div>
    </section>
  );
}