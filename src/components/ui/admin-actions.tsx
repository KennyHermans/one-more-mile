import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Trash2, 
  Edit3, 
  Eye, 
  Download, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from "lucide-react";

interface ActionButtonsProps {
  item: any;
  type: 'application' | 'trip' | 'sensei' | 'announcement';
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  onApprove?: (item: any) => void;
  onReject?: (item: any) => void;
  onContact?: (item: any) => void;
  disabled?: boolean;
}

interface BulkActionsProps {
  selectedItems: any[];
  onBulkAction: (action: string, items: any[]) => void;
  availableActions: string[];
  isLoading?: boolean;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  confirmVariant?: "default" | "destructive";
  isLoading?: boolean;
}

export function ActionButtons({
  item,
  type,
  onEdit,
  onDelete,
  onView,
  onApprove,
  onReject,
  onContact,
  disabled = false
}: ActionButtonsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'approved': return <CheckCircle className="w-3 h-3" />;
      case 'rejected': return <XCircle className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status Badge */}
      {item.status && (
        <Badge className={`flex items-center gap-1 border ${getStatusColor(item.status)}`}>
          {getStatusIcon(item.status)}
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {onView && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(item)}
            disabled={disabled}
            className="h-8 px-2"
          >
            <Eye className="w-3 h-3" />
            <span className="sr-only">View</span>
          </Button>
        )}

        {onContact && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onContact(item)}
            disabled={disabled}
            className="h-8 px-2"
          >
            <Mail className="w-3 h-3" />
            <span className="sr-only">Contact</span>
          </Button>
        )}

        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
            disabled={disabled}
            className="h-8 px-2"
          >
            <Edit3 className="w-3 h-3" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {/* Approval Actions */}
        {item.status === 'pending' && onApprove && onReject && (
          <>
            <Button
              size="sm"
              onClick={() => onApprove(item)}
              disabled={disabled}
              className="h-8 px-3 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onReject(item)}
              disabled={disabled}
              className="h-8 px-3"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </>
        )}

        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                className="h-8 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
                <span className="sr-only">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this {type}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(item)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

export function BulkActions({
  selectedItems,
  onBulkAction,
  availableActions,
  isLoading = false
}: BulkActionsProps) {
  const [selectedAction, setSelectedAction] = useState("");
  const { toast } = useToast();

  const handleBulkAction = () => {
    if (!selectedAction || selectedItems.length === 0) {
      toast({
        title: "No action selected",
        description: "Please select an action and items to perform bulk operation.",
        variant: "destructive"
      });
      return;
    }

    onBulkAction(selectedAction, selectedItems);
    setSelectedAction("");
  };

  if (selectedItems.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="font-medium">
              {selectedItems.length} selected
            </Badge>
            
            <div className="flex items-center gap-2">
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Choose action..." />
                </SelectTrigger>
                <SelectContent>
                  {availableActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={handleBulkAction}
                disabled={!selectedAction || isLoading}
                size="sm"
              >
                {isLoading ? "Processing..." : "Apply"}
              </Button>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onBulkAction("clear", [])}
          >
            Clear Selection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  confirmVariant = "default",
  isLoading = false
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant={confirmVariant}
            onClick={onConfirm} 
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuickActions({ 
  onRefresh, 
  onExport, 
  onImport, 
  isLoading = false 
}: {
  onRefresh?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <Download className="w-4 h-4 mr-2" />
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      )}
      
      {onExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      )}
      
      {onImport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
        >
          <Download className="w-4 h-4 mr-2" />
          Import
        </Button>
      )}
    </div>
  );
}