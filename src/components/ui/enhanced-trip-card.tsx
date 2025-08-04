import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, AlertTriangle, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { TripBooking } from '@/types/trip';

interface EnhancedTripCardProps {
  booking: TripBooking;
  onPayNow?: (booking: TripBooking) => Promise<void>;
  onCancel?: (bookingId: string) => void;
  paymentLoading?: boolean;
}

export function EnhancedTripCard({ 
  booking, 
  onPayNow, 
  onCancel, 
  paymentLoading = false 
}: EnhancedTripCardProps) {
  const isPaid = booking.payment_status === 'paid';
  const isOverdue = booking.payment_deadline ? new Date(booking.payment_deadline) < new Date() : false;
  
  // Calculate days until payment deadline
  const daysUntilDeadline = booking.payment_deadline 
    ? Math.ceil((new Date(booking.payment_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusColor = () => {
    if (isPaid) return "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20";
    if (isOverdue) return "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20";
    return "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20";
  };

  const getStatusIcon = () => {
    if (isPaid) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (isOverdue) return <AlertTriangle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-orange-600" />;
  };

  const getStatusText = () => {
    if (isPaid) return "Paid & Confirmed";
    if (isOverdue) return "Payment Overdue";
    return "Payment Pending";
  };

  const getStatusBadgeVariant = () => {
    if (isPaid) return "default";
    if (isOverdue) return "destructive";
    return "secondary";
  };

  const getUrgencyText = () => {
    if (isPaid) return null;
    if (isOverdue) return "Payment overdue!";
    if (daysUntilDeadline !== null) {
      if (daysUntilDeadline <= 1) return "Payment due today!";
      if (daysUntilDeadline <= 3) return `Payment due in ${daysUntilDeadline} days`;
      return `Payment due in ${daysUntilDeadline} days`;
    }
    return null;
  };

  return (
    <Card className={cn("overflow-hidden transition-all duration-200", getStatusColor())}>
      {/* Status Header */}
      <div className={cn(
        "px-4 py-2 flex items-center justify-between",
        isPaid ? "bg-green-100 dark:bg-green-900/30" : 
        isOverdue ? "bg-red-100 dark:bg-red-900/30" : 
        "bg-orange-100 dark:bg-orange-900/30"
      )}>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={cn(
            "font-semibold text-sm",
            isPaid ? "text-green-800 dark:text-green-200" :
            isOverdue ? "text-red-800 dark:text-red-200" :
            "text-orange-800 dark:text-orange-200"
          )}>
            {getStatusText()}
          </span>
        </div>
        
        {!isPaid && (
          <div className="text-right">
            <Badge 
              variant={getStatusBadgeVariant()}
              className="text-xs"
            >
              {getUrgencyText()}
            </Badge>
          </div>
        )}
      </div>

      {/* Main Card Content */}
      <div className="flex">
        <img 
          src={booking.trip?.image_url || ''} 
          alt={booking.trip?.title || 'Trip'}
          className="w-32 h-32 object-cover"
        />
        <CardContent className="flex-1 p-4">
          <div className="flex justify-between items-start h-full">
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-lg">{booking.trip?.title}</h3>
              <p className="text-muted-foreground">{booking.trip?.destination}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {booking.trip?.dates}
              </div>
              {booking.trip?.sensei_name && (
                <p className="text-sm text-muted-foreground">Sensei: {booking.trip.sensei_name}</p>
              )}
            </div>
            
            <div className="text-right space-y-3">
              {/* Price Display */}
              <div className="flex items-center gap-1 justify-end">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-semibold">${booking.total_amount}</span>
              </div>

              {/* Payment Deadline for Pending */}
              {!isPaid && booking.payment_deadline && (
                <div className={cn(
                  "text-sm font-medium p-2 rounded-md",
                  isOverdue 
                    ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200" 
                    : daysUntilDeadline && daysUntilDeadline <= 3
                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                )}>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Due: {new Date(booking.payment_deadline).toLocaleDateString()}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              {isPaid ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Confirmed
                </Badge>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button 
                    size="sm"
                    onClick={() => onPayNow?.(booking)}
                    disabled={paymentLoading}
                    className={cn(
                      "w-full",
                      isOverdue ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
                    )}
                  >
                    {paymentLoading ? 'Processing...' : isOverdue ? 'Pay Overdue' : 'Pay Now'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onCancel?.(booking.id)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}