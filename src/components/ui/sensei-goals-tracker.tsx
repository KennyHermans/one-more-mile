import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { 
  Plus, 
  Edit3, 
  Save, 
  X, 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Clock,
  AlertCircle,
  CheckCircle,
  Target,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logError, logInfo } from "@/lib/error-handler";

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'trips' | 'revenue' | 'rating' | 'skills';
  target: number;
  current: number;
  deadline: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
}

interface Milestone {
  id: string;
  goalId: string;
  title: string;
  completed: boolean;
  completedDate?: Date;
}

export function SenseiGoalsTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'trips' as Goal['category'],
    target: 0,
    deadline: new Date(),
    priority: 'medium' as Goal['priority']
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchGoalsAndMilestones();
  }, []);

  const fetchGoalsAndMilestones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get sensei profile
      const { data: senseiProfile } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!senseiProfile) return;

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('sensei_goals')
        .select('*')
        .eq('sensei_id', senseiProfile.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('sensei_milestones')
        .select('*')
        .in('goal_id', goalsData?.map(g => g.id) || [])
        .order('created_at', { ascending: true });

      if (milestonesError) throw milestonesError;

      // Transform data to match interface
      const transformedGoals: Goal[] = goalsData?.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description || '',
        category: goal.category as Goal['category'],
        target: Number(goal.target),
        current: Number(goal.current_value || 0),
        deadline: new Date(goal.deadline || new Date()),
        priority: goal.priority as Goal['priority'],
        status: goal.status as Goal['status']
      })) || [];

      const transformedMilestones: Milestone[] = milestonesData?.map(milestone => ({
        id: milestone.id,
        goalId: milestone.goal_id,
        title: milestone.title,
        completed: milestone.completed || false,
        completedDate: milestone.completed_date ? new Date(milestone.completed_date) : undefined
      })) || [];

      setGoals(transformedGoals);
      setMilestones(transformedMilestones);
    } catch (error) {
      logError(error as Error, {
        component: 'SenseiGoalsTracker',
        action: 'fetchGoalsAndMilestones'
      });
      toast({
        title: "Error",
        description: "Failed to load goals and milestones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: Goal['category']) => {
    switch (category) {
      case 'trips': return <MapPin className="h-4 w-4" />;
      case 'revenue': return <Target className="h-4 w-4" />;
      case 'rating': return <CheckCircle className="h-4 w-4" />;
      case 'skills': return <Users className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: Goal['category']) => {
    switch (category) {
      case 'trips': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'revenue': return 'bg-green-100 text-green-800 border-green-200';
      case 'rating': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'skills': return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const getPriorityColor = (priority: Goal['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
    }
  };

  const getProgress = (goal: Goal) => {
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  const getDaysUntilDeadline = (deadline: Date) => {
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCreateGoal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: senseiProfile } = await supabase
        .from('sensei_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!senseiProfile) return;

      const { error } = await supabase
        .from('sensei_goals')
        .insert({
          sensei_id: senseiProfile.id,
          title: goalForm.title,
          description: goalForm.description,
          category: goalForm.category,
          target: goalForm.target,
          deadline: goalForm.deadline.toISOString().split('T')[0],
          priority: goalForm.priority
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal created successfully.",
      });

      setCreateGoalOpen(false);
      setGoalForm({
        title: '',
        description: '',
        category: 'trips',
        target: 0,
        deadline: new Date(),
        priority: 'medium'
      });

      fetchGoalsAndMilestones();
    } catch (error) {
      logError(error as Error, {
        component: 'SenseiGoalsTracker',
        action: 'createGoal'
      });
      toast({
        title: "Error",
        description: "Failed to create goal.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGoal = async () => {
    if (!editingGoal) return;
    
    try {
      const { error } = await supabase
        .from('sensei_goals')
        .update({
          title: goalForm.title,
          description: goalForm.description,
          target: goalForm.target,
          deadline: goalForm.deadline.toISOString().split('T')[0],
          priority: goalForm.priority
        })
        .eq('id', editingGoal.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal updated successfully.",
      });

      setEditingGoal(null);
      fetchGoalsAndMilestones();
    } catch (error) {
      logError(error as Error, {
        component: 'SenseiGoalsTracker',
        action: 'updateGoal',
        metadata: { goalId: editingGoal?.id }
      });
      toast({
        title: "Error",
        description: "Failed to update goal.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('sensei_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal deleted successfully.",
      });

      fetchGoalsAndMilestones();
    } catch (error) {
      logError(error as Error, {
        component: 'SenseiGoalsTracker',
        action: 'deleteGoal',
        metadata: { goalId }
      });
      toast({
        title: "Error",
        description: "Failed to delete goal.",
        variant: "destructive",
      });
    }
  };

  const toggleMilestone = async (milestoneId: string) => {
    try {
      const milestone = milestones.find(m => m.id === milestoneId);
      if (!milestone) return;

      const { error } = await supabase
        .from('sensei_milestones')
        .update({
          completed: !milestone.completed,
          completed_date: !milestone.completed ? new Date().toISOString() : null
        })
        .eq('id', milestoneId);

      if (error) throw error;

      fetchGoalsAndMilestones();
    } catch (error) {
      logError(error as Error, {
        component: 'SenseiGoalsTracker',
        action: 'toggleMilestone',
        metadata: { milestoneId }
      });
      toast({
        title: "Error",
        description: "Failed to update milestone.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Goals & Milestones</h2>
            <p className="text-muted-foreground">Track your progress and achieve your sensei objectives</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Goals & Milestones</h2>
          <p className="text-muted-foreground">Track your progress and achieve your sensei objectives</p>
        </div>
        <Dialog open={createGoalOpen} onOpenChange={setCreateGoalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="Goal title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="Describe your goal"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={goalForm.category} onValueChange={(value: Goal['category']) => setGoalForm({ ...goalForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trips">Trips</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="skills">Skills</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Target</label>
                  <Input
                    type="number"
                    value={goalForm.target}
                    onChange={(e) => setGoalForm({ ...goalForm, target: Number(e.target.value) })}
                    placeholder="Target value"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={goalForm.priority} onValueChange={(value: Goal['priority']) => setGoalForm({ ...goalForm, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Deadline</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(goalForm.deadline, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={goalForm.deadline}
                        onSelect={(date) => date && setGoalForm({ ...goalForm, deadline: date })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCreateGoalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGoal}>
                  Create Goal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const progress = getProgress(goal);
          const daysLeft = getDaysUntilDeadline(goal.deadline);
          const goalMilestones = milestones.filter(m => m.goalId === goal.id);
          
          return (
            <Card key={goal.id} className={`border-l-4 ${getPriorityColor(goal.priority)} shadow-lg`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getCategoryColor(goal.category)} gap-1`}>
                      {getCategoryIcon(goal.category)}
                      {goal.category}
                    </Badge>
                    <Badge variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'default' : 'secondary'}>
                      {goal.priority}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingGoal(goal);
                        setGoalForm({
                          title: goal.title,
                          description: goal.description,
                          category: goal.category,
                          target: goal.target,
                          deadline: goal.deadline,
                          priority: goal.priority
                        });
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{goal.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{goal.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {goal.current} / {goal.target} 
                      {goal.category === 'revenue' ? ' USD' : goal.category === 'rating' ? '/5' : ''}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">{progress.toFixed(1)}% complete</span>
                    {daysLeft > 0 ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {daysLeft} days left
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Overdue
                      </span>
                    )}
                  </div>
                </div>

                {/* Milestones */}
                {goalMilestones.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Milestones</h4>
                    <div className="space-y-2">
                      {goalMilestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-center gap-2">
                          <button
                            onClick={() => toggleMilestone(milestone.id)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              milestone.completed 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-300 hover:border-green-400'
                            }`}
                          >
                            {milestone.completed && <CheckCircle className="h-3 w-3 text-white" />}
                          </button>
                          <span className={`text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {milestone.title}
                          </span>
                          {milestone.completed && milestone.completedDate && (
                            <span className="text-xs text-green-600 ml-auto">
                              {format(milestone.completedDate, "MMM dd")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                placeholder="Goal title"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={goalForm.description}
                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                placeholder="Describe your goal"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Target</label>
                <Input
                  type="number"
                  value={goalForm.target}
                  onChange={(e) => setGoalForm({ ...goalForm, target: Number(e.target.value) })}
                  placeholder="Target value"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={goalForm.priority} onValueChange={(value: Goal['priority']) => setGoalForm({ ...goalForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingGoal(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateGoal}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}