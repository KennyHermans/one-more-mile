import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Users, Lock } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/explore">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            
            <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: January 1, 2024</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Privacy Matters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                At One More Mile, we are committed to protecting your privacy and ensuring the security of your personal information. This privacy policy explains how we collect, use, and safeguard your data.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  1. What We Collect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Personal Information</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Name, email address, and contact details</li>
                      <li>• Date of birth and identification documents</li>
                      <li>• Profile photos and preferences</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Booking Information</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Trip bookings and payment information</li>
                      <li>• Travel preferences and dietary requirements</li>
                      <li>• Emergency contact information</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Usage Data</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Website interactions and browsing patterns</li>
                      <li>• Device information and IP addresses</li>
                      <li>• Cookies and similar tracking technologies</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Trip Management:</strong> Process bookings, payments, and coordinate travel arrangements</li>
                  <li>• <strong>Communication:</strong> Send trip updates, confirmations, and important notifications</li>
                  <li>• <strong>Personalization:</strong> Customize trip recommendations and improve your experience</li>
                  <li>• <strong>Safety:</strong> Verify identities and ensure traveler safety</li>
                  <li>• <strong>Platform Improvement:</strong> Analyze usage patterns to enhance our services</li>
                  <li>• <strong>Marketing:</strong> Send promotional offers and travel opportunities (with your consent)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  3. Information Sharing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">We share your information only when necessary:</p>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm">With Trip Hosts (Senseis)</h4>
                    <p className="text-sm text-muted-foreground">Contact details and trip-relevant information to facilitate your experience</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Payment Processors</h4>
                    <p className="text-sm text-muted-foreground">Secure payment information with trusted partners like Stripe</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Service Providers</h4>
                    <p className="text-sm text-muted-foreground">Third-party services necessary for trip operations (hotels, transport, etc.)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Legal Requirements</h4>
                    <p className="text-sm text-muted-foreground">When required by law or to protect safety and security</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-accent/10 rounded-lg">
                  <p className="text-sm font-semibold">We never sell your personal data.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  4. Data Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Industry-standard encryption for data transmission</li>
                  <li>• Secure servers and regular security audits</li>
                  <li>• Limited access to personal information by authorized personnel only</li>
                  <li>• Regular security training for our team</li>
                  <li>• Secure payment processing through certified providers</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Your Rights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">You have the right to:</p>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Access:</strong> Request a copy of your personal data</li>
                  <li>• <strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li>• <strong>Deletion:</strong> Request deletion of your personal data</li>
                  <li>• <strong>Portability:</strong> Request your data in a portable format</li>
                  <li>• <strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                  <li>• <strong>Restrict Processing:</strong> Limit how we process your data</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Cookies & Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  We use cookies and similar technologies to enhance your experience, remember your preferences, and analyze website usage. You can control cookie settings through your browser preferences.
                </p>
                <div className="space-y-2 text-sm">
                  <li>• <strong>Essential Cookies:</strong> Required for basic website functionality</li>
                  <li>• <strong>Analytics Cookies:</strong> Help us understand how you use our site</li>
                  <li>• <strong>Marketing Cookies:</strong> Used for personalized advertising (optional)</li>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 p-6 bg-muted rounded-lg">
            <h3 className="font-semibold mb-4">Related Policies</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" asChild>
                <Link to="/terms">Terms of Service</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/cancellation-policy">Cancellation Policy</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h3 className="font-semibold mb-2">Questions About Your Privacy?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Contact our Data Protection Officer at kenny_hermans93@hotmail.com
            </p>
            <p className="text-xs text-muted-foreground">
              We will respond to privacy requests within 30 days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;