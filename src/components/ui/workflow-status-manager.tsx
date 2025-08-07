import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  FileText, 
  Send,
  MessageSquare,
  ArrowRight,
  History
} from 'lucide-react';

interface WorkflowStep {
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  label: string;
  description: string;
  icon: any;
  color: string;
}

interface WorkflowHistory {
  id: string;
  previous_status: string;
  new_status: string;
  changed_by: string;
  change_reason: string;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  comment_type: 'general' | 'approval' | 'suggestion' | 'issue';
  field_reference?: string;
  is_resolved: boolean;
  created_at: string;
}

interface WorkflowStatusManagerProps {
  tripId: string;
  currentStatus: string;
  onStatusChange: (newStatus: string, reason?: string) => void;
  canManageWorkflow?: boolean;
  className?: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    status: 'draft',
    label: 'Draft',
    description: 'Trip is being created and edited',
    icon: FileText,
    color: 'text-gray-500'
  },
  {
    status: 'review',
    label: 'Under Review',
    description: 'Trip is being reviewed by administrators',
    icon: Clock,
    color: 'text-yellow-500'
  },
  {
    status: 'approved',
    label: 'Approved',
    description: 'Trip has been approved for publication',
    icon: CheckCircle,
    color: 'text-green-500'
  },
  {
    status: 'published',
    label: 'Published',
    description: 'Trip is live and accepting bookings',
    icon: Users,
    color: 'text-blue-500'
  },
  {
    status: 'archived',
    label: 'Archived',
    description: 'Trip is no longer active',
    icon: AlertCircle,
    color: 'text-red-500'
  }
];

export function WorkflowStatusManager({
  tripId,
  currentStatus,
  onStatusChange,
  canManageWorkflow = false,
  className
}: WorkflowStatusManagerProps) {
  const [history, setHistory] = useState<WorkflowHistory[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'general' | 'approval' | 'suggestion' | 'issue'>('general');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkflowHistory();
    fetchComments();
  }, [tripId]);

  const fetchWorkflowHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_workflow_history')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching workflow history:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_collaboration_comments')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments((data || []) as Comment[]);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!canManageWorkflow) return;

    try {
      // Record in workflow history
      const { error: historyError } = await supabase
        .from('trip_workflow_history')
        .insert([{
          trip_id: tripId,
          previous_status: currentStatus,
          new_status: newStatus,
          changed_by: (await supabase.auth.getUser()).data.user?.id,
          change_reason: statusChangeReason,
          requires_approval: newStatus === 'published'
        }]);

      if (historyError) throw historyError;

      onStatusChange(newStatus, statusChangeReason);
      setChangeDialogOpen(false);
      setStatusChangeReason('');
      fetchWorkflowHistory();

      toast({
        title: "Status Updated",
        description: `Trip status changed to ${newStatus}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('trip_collaboration_comments')
        .insert([{
          trip_id: tripId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          comment_text: newComment,
          comment_type: commentType
        }]);

      if (error) throw error;

      setNewComment('');
      setCommentType('general');
      fetchComments();

      toast({
        title: "Comment Added",
        description: "Your comment has been posted",
      });
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.status === currentStatus);
  };

  const getNextPossibleStatuses = () => {
    const currentIndex = getCurrentStepIndex();
    const nextStatuses = [];

    // Can move forward to next status
    if (currentIndex < workflowSteps.length - 1) {
      nextStatuses.push(workflowSteps[currentIndex + 1]);
    }

    // Can always archive (except if already archived)
    if (currentStatus !== 'archived') {
      nextStatuses.push(workflowSteps.find(step => step.status === 'archived')!);
    }

    // Can move back to draft for revisions (except from draft)
    if (currentStatus !== 'draft') {
      nextStatuses.push(workflowSteps.find(step => step.status === 'draft')!);
    }

    return nextStatuses;
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'approval': return 'bg-green-500';
      case 'suggestion': return 'bg-blue-500';
      case 'issue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Workflow Status
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.status === currentStatus;
              const isPast = getCurrentStepIndex() > index;
              
              return (
                <div key={step.status} className="flex items-center">
                  <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors
                    ${isActive ? 'bg-primary/10 border border-primary' : 
                      isPast ? 'bg-green-100 dark:bg-green-900/20' : 'bg-muted'}`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 
                      isPast ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${isActive ? 'text-primary' : 
                      isPast ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  
                  {index < workflowSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          {canManageWorkflow && (
            <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Change Status</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Trip Status</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={targetStatus} onValueChange={setTargetStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {getNextPossibleStatuses().map((step) => (
                        <SelectItem key={step.status} value={step.status}>
                          {step.label} - {step.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Textarea
                    placeholder="Reason for status change (optional)"
                    value={statusChangeReason}
                    onChange={(e) => setStatusChangeReason(e.target.value)}
                  />
                  
                  <Button 
                    onClick={() => handleStatusChange(targetStatus)}
                    disabled={!targetStatus}
                    className="w-full"
                  >
                    Update Status
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Workflow History */}
        <div>
          <h4 className="font-medium mb-3">Status History</h4>
          <ScrollArea className="h-32">
            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 text-sm p-2 bg-muted/30 rounded">
                    <div className="flex-1">
                      <div>
                        Changed from <Badge variant="outline">{item.previous_status}</Badge> to{' '}
                        <Badge variant="outline">{item.new_status}</Badge>
                      </div>
                      {item.change_reason && (
                        <div className="text-muted-foreground mt-1">{item.change_reason}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No status changes yet</div>
            )}
          </ScrollArea>
        </div>

        {/* Comments Section */}
        <div>
          <h4 className="font-medium mb-3">Comments & Feedback</h4>
          
          {/* Add Comment */}
          <div className="space-y-3 mb-4">
            <Select value={commentType} onValueChange={(value: any) => setCommentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Comment</SelectItem>
                <SelectItem value="approval">Approval Note</SelectItem>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="issue">Issue Report</SelectItem>
              </SelectContent>
            </Select>
            
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            
            <Button onClick={addComment} disabled={!newComment.trim()}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          </div>

          {/* Comments List */}
          <ScrollArea className="h-40">
            {comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="secondary" 
                        className={`${getCommentTypeColor(comment.comment_type)} text-white text-xs`}
                      >
                        {comment.comment_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment_text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No comments yet</div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}