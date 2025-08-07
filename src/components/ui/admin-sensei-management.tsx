import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SenseiLevelBadge } from '@/components/ui/sensei-level-badge';
import { useAdminSenseiManagement } from '@/hooks/use-admin-sensei-management';
import { 
  Star, 
  MapPin, 
  Calendar, 
  Users, 
  Edit2, 
  Power, 
  PowerOff,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SenseiCardSkeleton } from '@/components/ui/sensei-card-skeleton';

export const AdminSenseiManagement: React.FC = () => {
  const {
    senseis,
    applications,
    isLoading,
    error,
    updateSenseiLevel,
    toggleSenseiStatus,
    updateApplicationStatus,
    getSenseiPermissions
  } = useAdminSenseiManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSensei, setSelectedSensei] = useState<any>(null);
  const [isUpdatingLevel, setIsUpdatingLevel] = useState<string | null>(null);

  // Filter senseis based on search and filters
  const filteredSenseis = senseis.filter(sensei => {
    const matchesSearch = sensei.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sensei.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || sensei.sensei_level === levelFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && sensei.is_active) ||
                         (statusFilter === 'inactive' && !sensei.is_active);
    
    return matchesSearch && matchesLevel && matchesStatus;
  });

  // Filter applications
  const pendingApplications = applications.filter(app => app.status === 'pending');

  const handleLevelUpdate = async (senseiId: string, newLevel: string) => {
    setIsUpdatingLevel(senseiId);
    await updateSenseiLevel(senseiId, newLevel, 'Admin manual update');
    setIsUpdatingLevel(null);
  };

  const getSenseiStats = (sensei: any) => {
    return {
      trips: sensei.trips_led || 0,
      rating: sensei.rating || 0,
      specialties: sensei.specialties?.length || 0
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SenseiCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading sensei data: {error}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sensei Management</h1>
          <p className="text-muted-foreground">
            Manage {senseis.length} senseis and {pendingApplications.length} pending applications
          </p>
        </div>
      </div>

      <Tabs defaultValue="senseis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="senseis">Active Senseis ({senseis.length})</TabsTrigger>
          <TabsTrigger value="applications">
            Applications ({pendingApplications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="senseis" className="space-y-6">
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Senseis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSenseis.map((sensei) => {
              const stats = getSenseiStats(sensei);
              return (
                <Card key={sensei.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{sensei.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{sensei.location}</span>
                        </div>
                      </div>
                      {sensei.image_url && (
                        <img 
                          src={sensei.image_url} 
                          alt={sensei.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <SenseiLevelBadge level={sensei.sensei_level as any} size="sm" />
                      <Badge variant={sensei.is_active ? "default" : "secondary"}>
                        {sensei.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-lg font-semibold">{stats.trips}</div>
                          <div className="text-xs text-muted-foreground">Trips</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {stats.rating.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">Rating</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold">{stats.specialties}</div>
                          <div className="text-xs text-muted-foreground">Specialties</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedSensei(sensei)}
                              className="flex-1"
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl" aria-describedby="sensei-management-description">
                            <DialogHeader>
                              <DialogTitle>Manage {sensei.name}</DialogTitle>
                              <p id="sensei-management-description" className="text-sm text-muted-foreground">
                                Update sensei level, status, and view permissions for {sensei.name}
                              </p>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Level Management */}
                              <div>
                                <h3 className="font-semibold mb-3">Sensei Level</h3>
                                <div className="flex items-center gap-3">
                                  <SenseiLevelBadge level={sensei.sensei_level as any} />
                                  <Select
                                    value={sensei.sensei_level} 
                                    onValueChange={(value) => handleLevelUpdate(sensei.id, value)}
                                    disabled={isUpdatingLevel === sensei.id}
                                  >
                                    <SelectTrigger className="w-[200px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="apprentice">Apprentice Sensei</SelectItem>
                                      <SelectItem value="journey_guide">Journey Guide</SelectItem>
                                      <SelectItem value="master_sensei">Master Sensei</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {isUpdatingLevel === sensei.id && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  )}
                                </div>
                              </div>

                              {/* Status Management */}
                              <div>
                                <h3 className="font-semibold mb-3">Status</h3>
                                <Button
                                  variant={sensei.is_active ? "destructive" : "default"}
                                  onClick={() => toggleSenseiStatus(sensei.id, !sensei.is_active)}
                                >
                                  {sensei.is_active ? (
                                    <>
                                      <PowerOff className="h-4 w-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Power className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* Specialties */}
                              <div>
                                <h3 className="font-semibold mb-3">Specialties</h3>
                                <div className="flex flex-wrap gap-2">
                                  {sensei.specialties?.map((specialty, index) => (
                                    <Badge key={index} variant="secondary">
                                      {specialty}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredSenseis.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No senseis found matching your filters.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <div className="grid gap-4">
            {pendingApplications.map((application) => (
              <Card key={application.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{application.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{application.email}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{application.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{application.years_experience} years</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(application.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {application.expertise_areas.map((area, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateApplicationStatus(application.id, 'approved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateApplicationStatus(application.id, 'rejected')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pendingApplications.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No pending applications.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};