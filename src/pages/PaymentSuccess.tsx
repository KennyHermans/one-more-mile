import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, CreditCard, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      handlePaymentSuccess(sessionId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('handle-payment-success', {
        body: { sessionId }
      });

      if (error) throw error;

      setPaymentDetails(data);
      
      toast({
        title: "Payment Successful!",
        description: data.message || "Your booking has been confirmed",
      });
    } catch (error: any) {
      console.error('Payment success handling error:', error);
      toast({
        title: "Error processing payment",
        description: error.message || "Please contact support if you were charged",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="py-20">
        <div className="container max-w-2xl">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <h1 className="font-serif text-3xl font-bold text-green-800 mb-4">
                Payment Successful!
              </h1>
              
              {paymentDetails ? (
                <div className="space-y-4">
                  <p className="text-lg text-green-700">
                    {paymentDetails.message}
                  </p>
                  
                  {paymentDetails.payment_type === "deposit" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                      <div className="flex items-center justify-center mb-2">
                        <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="font-semibold text-blue-800">Payment Plan Active</h3>
                      </div>
                      <p className="text-sm text-blue-700">
                        Your deposit has been received and your trip is reserved! 
                        Remaining payments will be automatically charged monthly.
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mt-6">
                    <h3 className="font-semibold mb-2 flex items-center justify-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      What's Next?
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Check your email for booking confirmation</li>
                      <li>• Complete your customer profile in the dashboard</li>
                      <li>• Submit required documents (passport, insurance, etc.)</li>
                      <li>• Connect with your Sensei and fellow travelers</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-lg text-gray-600 mb-6">
                  Your payment has been processed successfully. You should receive a confirmation email shortly.
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button 
                  onClick={() => navigate('/customer/dashboard')}
                  className="flex items-center"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/explore')}
                >
                  Explore More Trips
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default PaymentSuccess;