import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SenseiLevelBadge } from '@/components/ui/sensei-level-badge';
import { EnhancedPermissionAwareField } from '@/components/ui/enhanced-permission-aware-field';
import { useAdminSenseiManagement } from '@/hooks/use-admin-sensei-management';
import { usePermissionValidator } from '@/hooks/use-permission-validator';
import { 
  Users, 
  TrendingUp, 
  Star, 
  Crown,
  Shield,
  Edit2, 
  Search,
  Filter,
  Loader2,
  CheckCircle,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const EnhancedAdminSenseiLevelOverview: React.FC = () => {
  const { senseis, isLoading, updateSenseiLevel } = useAdminSenseiManagement();
  const { validateAdminPermissions } = usePermissionValidator();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedSensei, setSelectedSensei] = useState<any>(null);
  const [isUpdatingLevel, setIsUpdatingLevel] = useState<string | null>(null);
  const [canManageLevels, setCanManageLevels] = useState(false);

  // Check admin permissions
  useEffect(() => {
    const checkPermissions = async () => {
      const hasPermission = await validateAdminPermissions('update_sensei_levels');
      setCanManageLevels(hasPermission);
    };
    checkPermissions();
  }, [validateAdminPermissions]);

  // Filter senseis
  const filteredSenseis = senseis.filter(sensei => {
    const matchesSearch = sensei.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sensei.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || sensei.sensei_level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  // Calculate level statistics
  const levelStats = senseis.reduce((acc, sensei) => {
    const level = sensei.sensei_level;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSenseis = senseis.length;
  const averageRating = senseis.length > 0 
    ? senseis.reduce((sum, sensei) => sum + sensei.rating, 0) / senseis.length 
    : 0;
  const totalTripsLed = senseis.reduce((sum, sensei) => sum + sensei.trips_led, 0);

  const handleLevelUpdate = async (senseiId: string, newLevel: string, reason?: string) => {
    if (!canManageLevels) return;
    
    setIsUpdatingLevel(senseiId);
    const result = await updateSenseiLevel(senseiId, newLevel, reason);
    if (result.success) {
      setSelectedSensei(null);
    }
    setIsUpdatingLevel(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Loading */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-40" />
            </div>
          </CardContent>
        </Card>

        {/* List Loading */}
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Senseis</p>
                <p className="text-2xl font-bold">{totalSenseis}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">
                {senseis.filter(s => s.is_active).length} active
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  {averageRating.toFixed(1)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Trips Led</p>
                <p className="text-2xl font-bold">{totalTripsLed}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Master Senseis</p>
                <p className="text-2xl font-bold">{levelStats.master_sensei || 0}</p>
              </div>
              <Crown className="h-8 w-8 text-accent-foreground" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {((levelStats.master_sensei || 0) / totalSenseis * 100).toFixed(1)}% of total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Apprentice Sensei</span>
                </div>
                <Badge variant="secondary">{levelStats.apprentice || 0}</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-muted-foreground h-2 rounded-full transition-all"
                  style={{ width: `${(levelStats.apprentice || 0) / totalSenseis * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-sm">Journey Guide</span>
                </div>
                <Badge variant="default">{levelStats.journey_guide || 0}</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(levelStats.journey_guide || 0) / totalSenseis * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-accent-foreground" />
                  <span className="text-sm">Master Sensei</span>
                </div>
                <Badge variant="outline">{levelStats.master_sensei || 0}</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-accent h-2 rounded-full transition-all"
                  style={{ width: `${(levelStats.master_sensei || 0) / totalSenseis * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search senseis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="apprentice">Apprentice</SelectItem>
                <SelectItem value="journey_guide">Journey Guide</SelectItem>
                <SelectItem value="master_sensei">Master Sensei</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Senseis List */}
      <div className="space-y-4">
        {filteredSenseis.map((sensei) => (
          <Card key={sensei.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{sensei.name}</h3>
                    <SenseiLevelBadge level={sensei.sensei_level as any} size="sm" />
                    <Badge variant={sensei.is_active ? "default" : "secondary"}>
                      {sensei.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{sensei.location}</span>
                    <span>•</span>
                    <span>{sensei.trips_led} trips led</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{sensei.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {canManageLevels && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedSensei(sensei)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Manage Level
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Manage {sensei.name}'s Level</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="text-center">
                          <SenseiLevelBadge level={sensei.sensei_level as any} size="lg" />
                          <p className="text-sm text-muted-foreground mt-2">
                            Current Level
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-semibold">{sensei.trips_led}</div>
                            <div className="text-muted-foreground">Trips Led</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold flex items-center justify-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {sensei.rating.toFixed(1)}
                            </div>
                            <div className="text-muted-foreground">Rating</div>
                          </div>
                        </div>

                        <EnhancedPermissionAwareField
                          fieldName="sensei_level"
                          senseiId={sensei.id}
                          label="New Level"
                          autoValidate={false}
                        >
                          <Select 
                            value={sensei.sensei_level} 
                            onValueChange={(value) => handleLevelUpdate(sensei.id, value, 'Admin manual update')}
                            disabled={isUpdatingLevel === sensei.id}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="apprentice">Apprentice Sensei</SelectItem>
                              <SelectItem value="journey_guide">Journey Guide</SelectItem>
                              <SelectItem value="master_sensei">Master Sensei</SelectItem>
                            </SelectContent>
                          </Select>
                        </EnhancedPermissionAwareField>

                        {isUpdatingLevel === sensei.id && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating level...
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSenseis.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No senseis found matching your filters.</p>
          </CardContent>
        </Card>
      )}

      {!canManageLevels && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">
                You don't have permission to update sensei levels. Contact an administrator for access.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};