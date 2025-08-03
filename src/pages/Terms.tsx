import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            
            <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: January 1, 2024</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Welcome to One More Mile</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Welcome to One More Mile ("Platform", "we", "our", "us"). By accessing or using our website or booking a trip, you agree to the following terms and conditions.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Eligibility</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• You must be at least 18 years old to book a trip or become a Sensei (host)</li>
                  <li>• Users under 18 may travel only with a legal guardian</li>
                  <li>• All travelers must provide valid identification and travel documents</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Our Role</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  We provide a platform for travelers ("Users") and expert hosts ("Senseis") to connect for immersive, theme-based group trips. We facilitate bookings but are not responsible for the delivery of the experience by the Sensei or third-party service providers (e.g., transport, accommodation).
                </p>
                <ul className="space-y-2 text-sm">
                  <li>• One More Mile acts as an intermediary platform</li>
                  <li>• We facilitate connections between travelers and Senseis</li>
                  <li>• We are not liable for the actions or services of Senseis or third parties</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Booking & Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• All bookings must be made through the platform</li>
                  <li>• Full payment is required to confirm your spot</li>
                  <li>• We use secure third-party payment processors (e.g., Stripe)</li>
                  <li>• Prices are subject to change until the booking is confirmed</li>
                  <li>• All payments are processed in USD unless otherwise specified</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. User Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">You agree:</p>
                <ul className="space-y-2 text-sm">
                  <li>• To provide accurate information</li>
                  <li>• To respect other participants, local laws, and cultural norms</li>
                  <li>• To maintain appropriate behavior during trips</li>
                  <li>• Not to harm or misuse the platform or its users</li>
                  <li>• To follow all safety guidelines provided by your Sensei</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Platform Rights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">We reserve the right to:</p>
                <ul className="space-y-2 text-sm">
                  <li>• Cancel or refuse service</li>
                  <li>• Modify or remove listings, reviews, or accounts violating our policies</li>
                  <li>• Change our terms with notice</li>
                  <li>• Suspend or terminate accounts for policy violations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  One More Mile is not liable for any damages, injuries, or losses that may occur during trips. Travelers participate at their own risk and are encouraged to obtain appropriate travel insurance.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 p-6 bg-muted rounded-lg">
            <h3 className="font-semibold mb-4">Related Policies</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" asChild>
                <Link to="/privacy">Privacy Policy</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/cancellation-policy">Cancellation Policy</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h3 className="font-semibold mb-2">Questions?</h3>
            <p className="text-sm text-muted-foreground">
              Contact us at kenny_hermans93@hotmail.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;