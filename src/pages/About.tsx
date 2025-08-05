import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Globe, Users, Compass } from "lucide-react";
const About = () => {
  const values = [{
    icon: Heart,
    title: "Purpose-Driven",
    description: "Every journey is designed to create meaningful connections and lasting personal growth."
  }, {
    icon: Globe,
    title: "Cultural Respect",
    description: "We honor and celebrate the rich traditions and communities we visit around the world."
  }, {
    icon: Users,
    title: "Expert Guidance",
    description: "Our Senseis are passionate specialists who share their knowledge and wisdom authentically."
  }, {
    icon: Compass,
    title: "Transformative Experiences",
    description: "We believe travel should challenge, inspire, and expand your perspective on life."
  }];
  const team = [{
    name: "Kenny Hermans",
    role: "Founder & CEO",
    bio: "Former travel journalist who discovered the transformative power of purposeful travel after a life-changing trek in the Himalayas.",
    image: "/lovable-uploads/0654a4fb-8308-4c54-a2ec-031f19de96db.png"
  }, {
    name: "Marcus Thompson",
    role: "Head of Sensei Relations",
    bio: "Cultural anthropologist and former Peace Corps volunteer with deep expertise in cross-cultural experiences.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face"
  }, {
    name: "Yuki Nakamura",
    role: "Experience Designer",
    bio: "Former adventure guide who crafts itineraries that balance challenge, beauty, and meaningful cultural exchange.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face"
  }];
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1920&h=1080&fit=crop" alt="Ocean wave at beach" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40"></div>
        </div>
        <div className="relative z-10 container text-white">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20">
              Our Story
            </Badge>
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Travel That Transforms Lives
            </h1>
            <p className="font-sans text-xl leading-relaxed">
              Founded on the belief that travel should be more than sightseeing, One More Mile creates 
              experiences that challenge, inspire, and connect people across cultures and continents.
            </p>
          </div>
        </div>
      </section>

      {/* About Kenny Section */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
              About me
            </h2>
            
            <div className="prose prose-lg max-w-none font-sans text-muted-foreground leading-relaxed space-y-6">
              <p>Hi, I'm glad you're interested in learning more about who's behind One More Mile. While some people might skip this page, I believe it's important for you to understand why and how One More Mile came into existence. There was a time when I was searching for organizations and people that build these kinds of trips. We all know that travelling can be expensive, but with the right people, organization and meaning, it becomes more of an investment than a cost.</p>
              
              <blockquote className="border-l-4 border-primary pl-6 italic text-lg font-medium text-foreground">
                "The best investment you can make is in yourself."
              </blockquote>
              
              <h3 className="font-serif text-2xl font-bold text-foreground mt-8 mb-4">
                Kenny Hermans – A Lifelong Love Affair with Travel
              </h3>
              
              <p>
                So, I'm Kenny Hermans, a 31-year-old Belgian, and I have a confession to make: I'm an addict. I'm addicted to travelling.
              </p>
              
              <p>
                It all began when my parents took me as a young child to holiday destinations like Kusadasi in Turkey, Costa Brava in southern Spain, Provence in the south of France, and Venice, Italy. I spent hours baking on the beach, posing for family pictures or strolling through streets full of souvenir shops.
              </p>
              
              <p>
                Eventually, when I turned 17, I could finally travel without my parents. I began my university studies in Denmark and the UK while squeezing in internships in New Zealand and Thailand. From there, I couldn't stop. Backpacking through Fiji, the USA, Cambodia, and Malaysia? Done. Exploring European hotspots like Barcelona, Paris, Rome, and Berlin? Absolutely.
              </p>
              
              <p>
                After getting my bachelor's degree, I grabbed a working-holiday visa for Australia and spent a year working (and, let's be honest, mostly traveling) in Melbourne, Sydney, Brisbane, and the Gold Coast. But I wasn't just in it for the adventure. I wanted to turn this passion into something more. So, I went back to Belgium for a degree in International Business Management, which led me to immersion trips in China, Hong Kong, and Japan. And because I can't sit still, I spent my vacation riding a motorcycle across the Himalayas and backpacking through India.
              </p>
              
              <p>
                Then came the so-called "grown-up" phase. I worked for Coca-Cola and Siemens before diving into entrepreneurship, opening a concept bar/restaurant. And because I like to go all-in, I visited Trappist abbeys worldwide from Spencer (USA) and Stift Engelszell (Austria) to Tre Fontane (Italy) and Koningshoeven (The Netherlands), for inspiration. But, of course, travel was still calling. City trips to Valencia, Lisbon, New York, Palermo, and Oslo? Check. Bigger adventures in Tanzania, the Philippines, the Grand Canyon, and Croatia? Double check. Oh, and somewhere in between, I ran the Marathon des Sables in the Moroccan Sahara.
              </p>
              
              <p>
                Fast forward to 2024, and my career officially caught up with my passion. I became the International Export Manager at Omexco, traveling the world for business, visiting over 50 countries, from Brazil to New-Zealand and Sweden to South Africa. But something changed. Travel wasn't just about checking places off a list anymore. It wasn't about partying in hostels or squeezing in every tourist attraction. It became about deeper connections, cultural understanding, and personal growth.
              </p>
              
              <p className="font-semibold">
                That's when One More Mile was born.
              </p>
              
              <p>
                In Man's Search for Meaning, Viktor Frankl wrote, "The meaning of life always changes, but that it never ceases to be." As humans, we are always searching for life's meaning. Perhaps a better question to ask is "what brings meaning to my life at this moment?" Let's be honest. I've done my fair share of "meaningless" miles. Visiting crowded tourist traps, taking the same photos as a thousand others, and returning home without any real takeaway. Don't get me wrong, everyone should travel. It teaches independence, forces you to handle the unexpected (yes, even getting scammed!), and pushes you out of your comfort zone.
              </p>
              
              <p>
                But at some point, I started craving something more. I believe travel should inspire and learn you something. Or, it should relaunch you after a breakup, illness, burnout, or depression. Sometimes, the best way to heal or rediscover yourself is to step outside of your routine, embrace new cultures, meet different people, and see life from a fresh perspective. Travel isn't just about where you go, it's about how it changes you.
              </p>
              
              <h3 className="font-serif text-2xl font-bold text-foreground mt-8 mb-4">
                Why travel with One More Mile?
              </h3>
              
              <p>
                With One More Mile, you travel with like-minded people who share your passion, interests and even problems, making every trip an opportunity to grow your network and form lasting connections. Whether it's fellow entrepreneurs, creatives, or adventure seekers, you'll come home with new friends, fresh ideas, and maybe even future business partners or your future wife, who knows. Our mission is that you should come back from a trip with fresh energy, a new hobby, perspective or business idea.
              </p>
              
              <p>
                Travel should leave a mark on you and that's what One More Mile is all about. We design travel experiences built around a specific theme or passion, whether it's (craft) beer, photography, health, or anything else that fuels curiosity and connection. It's travel with depth, purpose, and unforgettable moments. It is an investment in yourself.
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li>Imagine working on your health under the sun at the beach.</li>
                <li>Imagine meditating in the middle of nature.</li>
                <li>Imagine working on your business idea at the swimming pool.</li>
                <li>Imagine learning about wine at a vineyard.</li>
                <li>Imagine learning about video and photography while capturing wildlife.</li>
                <li>Or, imagine how to cook at an outdoor cooking spot surrounded by fresh vegetables and plants.</li>
              </ul>
              
              <p>
                If this does not excite you, these trips are not for you. :D Otherwise, join one of our trips and maybe you will be one of our next Travel Sensei (specialist in their field)
              </p>
              
              <p className="font-semibold">
                Let's make it meaningful.
              </p>
              
              <p className="text-right font-medium">
                Kenny
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-secondary/20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide every adventure we create and every relationship we build
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => <Card key={index} className="text-center border-0 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="pt-8">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <value.icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="font-sans text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Meet Our Team
            </h2>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto">
              Passionate travel experts dedicated to creating extraordinary experiences
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <img src={member.image} alt={member.name} className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" />
                  <CardTitle className="font-serif text-xl text-foreground">
                    {member.name}
                  </CardTitle>
                  <Badge variant="secondary" className="mx-auto">
                    {member.role}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="font-sans text-muted-foreground leading-relaxed">
                    {member.bio}
                  </p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 bg-gradient-to-br from-primary to-accent text-white">
        <div className="container text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-8">
            Our Impact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="font-serif text-5xl font-bold mb-2">500+</div>
              <div className="font-sans text-lg">Transformative Adventures</div>
            </div>
            <div>
              <div className="font-serif text-5xl font-bold mb-2">2000+</div>
              <div className="font-sans text-lg">Lives Changed</div>
            </div>
            <div>
              <div className="font-serif text-5xl font-bold mb-2">35+</div>
              <div className="font-sans text-lg">Countries Explored</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready for Your Next Adventure?
          </h2>
          <p className="font-sans text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of travelers who've discovered the transformative power of purposeful exploration
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="font-sans font-medium">
              <a href="/explore">Explore Trips</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-sans font-medium">
              <a href="/contact">Contact Us</a>
            </Button>
          </div>
        </div>
      </section>
    </div>;
};
export default About;