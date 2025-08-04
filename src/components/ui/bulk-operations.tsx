import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, 
  XSquare, 
  Mail, 
  Download,
  Trash2,
  Users,
  MessageSquare,
  FileDown,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BulkOperationsProps {
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  itemType: 'applications' | 'trips' | 'senseis' | 'bookings';
  allItems: any[];
}

export function BulkOperations({ 
  selectedItems, 
  onSelectionChange, 
  itemType,
  allItems 
}: BulkOperationsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const { toast } = useToast();

  const handleBulkAction = (action: string) => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to perform bulk actions.",
        variant: "destructive"
      });
      return;
    }

    setPendingAction(action);
    
    if (action === 'message') {
      setShowMessageDialog(true);
    } else {
      setShowConfirmDialog(true);
    }
  };

  const confirmAction = async () => {
    try {
      switch (pendingAction) {
        case 'approve':
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast({
            title: "Applications approved",
            description: `${selectedItems.length} applications have been approved.`
          });
          break;
        case 'reject':
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast({
            title: "Applications rejected",
            description: `${selectedItems.length} applications have been rejected.`
          });
          break;
        case 'activate':
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast({
            title: "Items activated",
            description: `${selectedItems.length} items have been activated.`
          });
          break;
        case 'deactivate':
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast({
            title: "Items deactivated",
            description: `${selectedItems.length} items have been deactivated.`
          });
          break;
        case 'delete':
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast({
            title: "Items deleted",
            description: `${selectedItems.length} items have been deleted.`
          });
          break;
        case 'export':
          // Simulate CSV export
          const csvData = allItems
            .filter(item => selectedItems.includes(item.id))
            .map(item => Object.values(item).join(','))
            .join('\n');
          
          const blob = new Blob([csvData], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${itemType}_export.csv`;
          a.click();
          
          toast({
            title: "Export completed",
            description: `${selectedItems.length} items exported to CSV.`
          });
          break;
      }
      
      onSelectionChange([]);
      setShowConfirmDialog(false);
    } catch (error) {
      toast({
        title: "Action failed",
        description: "There was an error performing the bulk action.",
        variant: "destructive"
      });
    }
  };

  const sendBulkMessage = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Messages sent",
        description: `Message sent to ${selectedItems.length} recipients.`
      });
      setShowMessageDialog(false);
      setMessage("");
      onSelectionChange([]);
    } catch (error) {
      toast({
        title: "Failed to send messages",
        description: "There was an error sending the messages.",
        variant: "destructive"
      });
    }
  };

  const messageTemplates = {
    welcome: "Welcome to One More Mile! We're excited to have you join our community.",
    reminder: "This is a friendly reminder about your upcoming deadline.",
    approval: "Congratulations! Your application has been approved.",
    rejection: "Thank you for your interest. Unfortunately, we cannot proceed at this time.",
    update: "We have an important update regarding your application/trip."
  };

  const getActionsByType = () => {
    const baseActions = [
      { id: 'export', label: 'Export to CSV', icon: Download, variant: 'outline' as const },
      { id: 'message', label: 'Send Message', icon: MessageSquare, variant: 'outline' as const }
    ];

    switch (itemType) {
      case 'applications':
        return [
          { id: 'approve', label: 'Approve', icon: CheckSquare, variant: 'default' as const },
          { id: 'reject', label: 'Reject', icon: XSquare, variant: 'destructive' as const },
          ...baseActions
        ];
      case 'trips':
        return [
          { id: 'activate', label: 'Activate', icon: CheckSquare, variant: 'default' as const },
          { id: 'deactivate', label: 'Deactivate', icon: XSquare, variant: 'destructive' as const },
          { id: 'copy', label: 'Clone Trips', icon: Copy, variant: 'outline' as const },
          ...baseActions
        ];
      case 'senseis':
        return [
          { id: 'activate', label: 'Activate', icon: Users, variant: 'default' as const },
          { id: 'deactivate', label: 'Deactivate', icon: XSquare, variant: 'destructive' as const },
          ...baseActions
        ];
      case 'bookings':
        return [
          { id: 'confirm', label: 'Confirm', icon: CheckSquare, variant: 'default' as const },
          { id: 'cancel', label: 'Cancel', icon: XSquare, variant: 'destructive' as const },
          ...baseActions
        ];
      default:
        return baseActions;
    }
  };

  const selectAll = () => {
    const allIds = allItems.map(item => item.id);
    onSelectionChange(allIds);
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedItems.length === allItems.length && allItems.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  selectAll();
                } else {
                  clearSelection();
                }
              }}
            />
            <span className="text-sm font-medium">
              {selectedItems.length > 0 
                ? `${selectedItems.length} selected`
                : 'Select all'
              }
            </span>
            {selectedItems.length > 0 && (
              <Badge variant="secondary">{selectedItems.length}</Badge>
            )}
          </div>
          
          {selectedItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              Clear selection
            </Button>
          )}
        </div>

        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2">
            {getActionsByType().map((action) => (
              <Button
                key={action.id}
                variant={action.variant}
                size="sm"
                onClick={() => handleBulkAction(action.id)}
                className="flex items-center gap-2"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {pendingAction} {selectedItems.length} item(s)? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAction}>
              Confirm {pendingAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Bulk Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedItems.length} selected recipient(s).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Template</label>
              <Select 
                value={messageTemplate} 
                onValueChange={(value) => {
                  setMessageTemplate(value);
                  setMessage(messageTemplates[value as keyof typeof messageTemplates] || "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome Message</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="approval">Approval Notice</SelectItem>
                  <SelectItem value="rejection">Rejection Notice</SelectItem>
                  <SelectItem value="update">General Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                placeholder="Enter your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendBulkMessage} disabled={!message.trim()}>
              <Mail className="h-4 w-4 mr-2" />
              Send to {selectedItems.length} recipient(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}