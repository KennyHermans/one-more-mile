import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="py-20">
        <div className="container max-w-2xl">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              
              <h1 className="font-serif text-3xl font-bold text-red-800 mb-4">
                Payment Canceled
              </h1>
              
              <p className="text-lg text-red-700 mb-6">
                Your payment was canceled and no charges have been made to your account.
              </p>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  What Happened?
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• You canceled the payment process</li>
                  <li>• Your trip spot is not reserved</li>
                  <li>• You can try booking again anytime</li>
                  <li>• No charges were made to your payment method</li>
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate(-1)}
                  className="flex items-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/explore')}
                >
                  Browse Other Trips
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default PaymentCancel;