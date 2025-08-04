import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CreditCard, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface PaymentInfo {
  tripId: string;
  tripTitle: string;
  totalAmount: number;
  paidAmount: number;
  nextPaymentAmount?: number;
  nextPaymentDate?: Date;
  status: "pending" | "partial" | "paid" | "overdue";
  daysUntilDue?: number;
}

interface PaymentStatusWidgetProps {
  payments: PaymentInfo[];
  onPayNow?: (tripId: string) => void;
  onViewDetails?: (tripId: string) => void;
}

export function PaymentStatusWidget({ 
  payments, 
  onPayNow, 
  onViewDetails 
}: PaymentStatusWidgetProps) {
  const urgentPayments = payments.filter(p => p.status === "overdue" || (p.daysUntilDue && p.daysUntilDue <= 7));
  const upcomingPayments = payments.filter(p => p.status === "pending" || p.status === "partial");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="h-4 w-4 text-success" />;
      case "overdue": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "partial": return <Clock className="h-4 w-4 text-warning" />;
      default: return <CreditCard className="h-4 w-4 text-info" />;
    }
  };

  const getStatusBadge = (status: string, daysUntilDue?: number) => {
    if (status === "overdue") {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (status === "paid") {
      return <Badge className="bg-success text-success-foreground">Paid</Badge>;
    }
    if (daysUntilDue && daysUntilDue <= 7) {
      return <Badge className="bg-warning text-warning-foreground">Due Soon</Badge>;
    }
    return <Badge variant="outline">{status === "partial" ? "Partial" : "Pending"}</Badge>;
  };

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2" />
            <p>No pending payments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Status
          {urgentPayments.length > 0 && (
            <Badge variant="destructive">
              {urgentPayments.length} urgent
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Urgent Payments */}
        {urgentPayments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-destructive">Urgent Payments</h4>
            {urgentPayments.map((payment) => (
              <div key={payment.tripId} className="p-3 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(payment.status)}
                    <span className="font-medium text-sm">{payment.tripTitle}</span>
                  </div>
                  {getStatusBadge(payment.status, payment.daysUntilDue)}
                </div>
                {payment.nextPaymentAmount && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Amount due:</span>
                      <span className="font-medium">${payment.nextPaymentAmount}</span>
                    </div>
                    {payment.nextPaymentDate && (
                      <div className="flex justify-between text-sm">
                        <span>Due date:</span>
                        <span className="text-destructive">
                          {format(payment.nextPaymentDate, "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => onPayNow?.(payment.tripId)}
                        className="flex-1"
                      >
                        Pay Now
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onViewDetails?.(payment.tripId)}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Payments */}
        {upcomingPayments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Upcoming Payments</h4>
            {upcomingPayments.slice(0, 3).map((payment) => {
              const progress = (payment.paidAmount / payment.totalAmount) * 100;
              return (
                <div key={payment.tripId} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <span className="font-medium text-sm">{payment.tripTitle}</span>
                    </div>
                    {getStatusBadge(payment.status, payment.daysUntilDue)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>${payment.paidAmount} / ${payment.totalAmount}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    
                    {payment.nextPaymentDate && payment.nextPaymentAmount && (
                      <div className="flex justify-between text-sm pt-1">
                        <span>Next payment:</span>
                        <span>${payment.nextPaymentAmount} on {format(payment.nextPaymentDate, "MMM d")}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {upcomingPayments.length > 3 && (
              <Button variant="outline" size="sm" className="w-full">
                View all payments ({upcomingPayments.length - 3} more)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}