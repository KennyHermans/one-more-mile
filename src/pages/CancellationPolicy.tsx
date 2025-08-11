import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, RefreshCw, AlertTriangle, Shield } from "lucide-react";

const CancellationPolicy = () => {
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
            
            <h1 className="text-4xl font-bold mb-2">Cancellation & Refund Policy</h1>
            <p className="text-muted-foreground">Last updated: January 1, 2024</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Flexible Cancellation Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                We understand that travel plans can change. Our cancellation policy is designed to be fair to both travelers and Senseis while protecting the integrity of our group experiences.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  1. Cancellation by Traveler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-sm mb-2 text-green-800 dark:text-green-200">
                      60+ Days Before Departure
                    </h4>
                    <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                      <li>• <strong>Full refund</strong> minus 5% service fee</li>
                      <li>• Processing time: 5-7 business days</li>
                      <li>• No questions asked cancellation</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-semibold text-sm mb-2 text-yellow-800 dark:text-yellow-200">
                      59-30 Days Before Departure
                    </h4>
                    <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                      <li>• <strong>50% refund</strong> of trip cost</li>
                      <li>• Opportunity to transfer to another trip</li>
                      <li>• Credit valid for 12 months</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h4 className="font-semibold text-sm mb-2 text-red-800 dark:text-red-200">
                      Less than 30 Days Before Departure
                    </h4>
                    <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                      <li>• <strong>No refund</strong> available</li>
                      <li>• Exception: Medical emergency with documentation</li>
                      <li>• Travel insurance claims may apply</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Cancellation by Sensei or One More Mile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">If we cancel your trip:</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Full refund</strong> of all payments made</li>
                      <li>• Option to rebook on a similar trip with priority placement</li>
                      <li>• $100 credit for future bookings as an apology</li>
                      <li>• Immediate notification and assistance with rebooking</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <p className="text-sm">
                      <strong>Important:</strong> We are not responsible for personal travel arrangements (flights, hotels booked separately, etc.) if we cancel a trip.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  3. Force Majeure & Emergency Situations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm">
                    In cases of circumstances beyond our control, including but not limited to:
                  </p>
                  
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Natural disasters (earthquakes, hurricanes, etc.)</li>
                    <li>• Political unrest or government advisories</li>
                    <li>• Pandemics or health emergencies</li>
                    <li>• Severe weather conditions</li>
                    <li>• Transportation strikes or disruptions</li>
                  </ul>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm">Our Response:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Full credit for future trips (no expiration)</li>
                        <li>• Partial refunds when possible</li>
                        <li>• Priority rebooking when conditions improve</li>
                        <li>• Regular updates on situation developments</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Special Circumstances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Medical Emergencies</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Doctor's certificate required</li>
                      <li>• Full refund available within 30 days of departure</li>
                      <li>• Documentation must be submitted within 48 hours</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Travel Visa Issues</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• 75% refund if visa is denied with official documentation</li>
                      <li>• Must provide visa application timeline proof</li>
                      <li>• Credit option available for future trips</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Family Emergencies</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Case-by-case evaluation</li>
                      <li>• Documentation required</li>
                      <li>• Credit or partial refund may be available</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  5. Travel Insurance Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">We Strongly Recommend Travel Insurance</h4>
                  <p className="text-sm mb-3">
                    Travel insurance can protect you from unexpected cancellation costs and provide additional coverage for medical emergencies, trip delays, and lost luggage.
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Purchase within 14 days of booking for full coverage</li>
                    <li>• Choose "cancel for any reason" policies when available</li>
                    <li>• Ensure medical coverage for international destinations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. How to Cancel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm">Online Cancellation</h4>
                    <p className="text-sm text-muted-foreground">Log in to your account and cancel through your dashboard</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Email Cancellation</h4>
                    <p className="text-sm text-muted-foreground">Send cancellation request to kenny_hermans93@hotmail.com</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Required Information</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Booking confirmation number</li>
                      <li>• Full name and contact information</li>
                      <li>• Reason for cancellation (if applicable)</li>
                      <li>• Supporting documentation for special circumstances</li>
                    </ul>
                  </div>
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
                <Link to="/privacy">Privacy Policy</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h3 className="font-semibold mb-2">Questions About Cancellations?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our customer service team is here to help: kenny_hermans93@hotmail.com
            </p>
            <p className="text-xs text-muted-foreground">
              Response time: Within 24 hours for cancellation requests
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;