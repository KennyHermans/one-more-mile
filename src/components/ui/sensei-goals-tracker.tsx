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
import { useState } from "react";
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
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Lead 30 Trips This Year',
      description: 'Complete 30 successful trips across different destinations',
      category: 'trips',
      target: 30,
      current: 24,
      deadline: new Date('2024-12-31'),
      priority: 'high',
      status: 'active'
    },
    {
      id: '2',
      title: 'Achieve 4.9 Rating',
      description: 'Maintain consistently high customer satisfaction',
      category: 'rating',
      target: 4.9,
      current: 4.7,
      deadline: new Date('2024-08-31'),
      priority: 'medium',
      status: 'active'
    },
    {
      id: '3',
      title: 'Generate $100K Revenue',
      description: 'Reach revenue milestone through quality experiences',
      category: 'revenue',
      target: 100000,
      current: 89450,
      deadline: new Date('2024-12-31'),
      priority: 'high',
      status: 'active'
    }
  ]);

  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: '1', goalId: '1', title: 'Complete 10 trips', completed: true, completedDate: new Date('2024-03-15') },
    { id: '2', goalId: '1', title: 'Complete 20 trips', completed: true, completedDate: new Date('2024-06-10') },
    { id: '3', goalId: '1', title: 'Complete 25 trips', completed: false },
    { id: '4', goalId: '1', title: 'Complete 30 trips', completed: false },
  ]);

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

  const handleCreateGoal = () => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      ...goalForm,
      current: 0,
      status: 'active'
    };
    setGoals([...goals, newGoal]);
    setCreateGoalOpen(false);
    setGoalForm({
      title: '',
      description: '',
      category: 'trips',
      target: 0,
      deadline: new Date(),
      priority: 'medium'
    });
  };

  const handleUpdateGoal = () => {
    if (!editingGoal) return;
    
    setGoals(goals.map(goal => 
      goal.id === editingGoal.id 
        ? { ...goal, ...goalForm }
        : goal
    ));
    setEditingGoal(null);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(goals.filter(goal => goal.id !== goalId));
    setMilestones(milestones.filter(milestone => milestone.goalId !== goalId));
  };

  const toggleMilestone = (milestoneId: string) => {
    setMilestones(milestones.map(milestone =>
      milestone.id === milestoneId
        ? { 
            ...milestone, 
            completed: !milestone.completed,
            completedDate: !milestone.completed ? new Date() : undefined
          }
        : milestone
    ));
  };

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