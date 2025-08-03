import { Card, CardContent } from "./card";
import { Badge } from "./badge";
import { Users, MapPin, Award, Star, TrendingUp, Shield } from "lucide-react";

export function SocialProofSection() {
  const metrics = [
    {
      icon: Users,
      value: "2,847",
      label: "Happy Travelers",
      description: "From 73 countries worldwide"
    },
    {
      icon: MapPin,
      value: "127",
      label: "Destinations",
      description: "Across 6 continents"
    },
    {
      icon: Award,
      value: "94%",
      label: "Satisfaction Rate",
      description: "Based on post-trip surveys"
    },
    {
      icon: Star,
      value: "4.9",
      label: "Average Rating",
      description: "From verified reviews"
    }
  ];

  const trustIndicators = [
    {
      icon: Shield,
      title: "100% Verified Senseis",
      description: "All guides are background-checked and certified"
    },
    {
      icon: TrendingUp,
      title: "Growing Community",
      description: "Join thousands of like-minded adventurers"
    }
  ];

  const achievements = [
    "Featured in Travel + Leisure 2024",
    "Best Adventure Platform - Travel Awards 2023",
    "Sustainable Tourism Certified",
    "5-Star Customer Support"
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-secondary/20 to-background">
      <div className="container">
        {/* Trust Indicators */}
        <div className="text-center mb-16">
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {achievements.map((achievement, index) => (
              <Badge key={index} variant="secondary" className="text-sm py-2 px-4 bg-accent/10 text-accent border-accent/20">
                {achievement}
              </Badge>
            ))}
          </div>
          
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Trusted by Adventurers Worldwide
          </h2>
          <p className="font-sans text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Join a community that values authentic experiences and meaningful connections
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {metrics.map((metric, index) => (
            <Card key={index} className="text-center border-0 bg-white/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-accent/10 rounded-full">
                    <metric.icon className="h-8 w-8 text-accent" />
                  </div>
                </div>
                <div className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {metric.value}
                </div>
                <div className="font-sans font-semibold text-foreground mb-1">
                  {metric.label}
                </div>
                <div className="font-sans text-sm text-muted-foreground">
                  {metric.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {trustIndicators.map((indicator, index) => (
            <Card key={index} className="border-0 bg-gradient-to-r from-accent/5 to-secondary/20 backdrop-blur-sm">
              <CardContent className="p-8 flex items-center space-x-4">
                <div className="p-3 bg-accent/10 rounded-full">
                  <indicator.icon className="h-10 w-10 text-accent" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-lg text-foreground mb-2">
                    {indicator.title}
                  </h3>
                  <p className="font-sans text-muted-foreground">
                    {indicator.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Social Proof Quote */}
        <div className="text-center mt-16">
          <div className="max-w-4xl mx-auto">
            <blockquote className="font-serif text-2xl md:text-3xl text-foreground italic mb-6 leading-relaxed">
              "One More Mile doesn't just organize trips – they create life-changing experiences that stay with you forever."
            </blockquote>
            <div className="flex items-center justify-center space-x-3">
              <img 
                src="https://images.unsplash.com/photo-1494790108755-2616b612b385?w=60&h=60&fit=crop&crop=face" 
                alt="Featured review"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="text-left">
                <div className="font-sans font-semibold text-foreground">Sarah Chen</div>
                <div className="font-sans text-sm text-muted-foreground">Returned Traveler, 8 trips completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}