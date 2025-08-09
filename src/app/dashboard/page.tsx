"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Loading } from "~/components/ui/loading";
import { DocumentUploadModal } from "~/components/dashboard/document-upload-modal";
import { DocumentsTable } from "~/components/dashboard/documents-table";
import { SignaturesTable } from "~/components/dashboard/signatures-table";
import { 
  FileText, 
  Upload, 
  Users, 
  CheckCircle, 
  Clock, 
  Plus,
  Settings,
  LogOut,
  Home,
  BarChart3,
  User,
  TrendingUp,
  Activity
} from "lucide-react";
import { signOut } from "next-auth/react";
import { api } from "~/utils/api";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Fetch dashboard data
  const { data: dashboardStats, isLoading: statsLoading } = api.documents.getDashboardStats.useQuery();
  const { data: documents, isLoading: documentsLoading } = api.documents.getAll.useQuery();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Loading className="h-8 w-8" />
          <div className="text-center">
            <div className="h-4 w-32 bg-muted rounded mx-auto mb-2"></div>
            <div className="h-3 w-24 bg-muted rounded mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userInitials = session.user?.name?.split(' ').map(n => n[0]).join('') || session.user?.email?.[0].toUpperCase() || 'U';

  // Calculate recent activity from documents
  const recentDocuments = documents?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">PayFlow</h1>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <nav className="flex items-center space-x-6">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2" onClick={() => router.push("/dashboard/analytics")}>
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </Button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <DocumentUploadModal>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>New Document</span>
              </Button>
            </DocumentUploadModal>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || "User"} />
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome back, {session.user?.name?.split(' ')[0] || 'User'}!
            </h2>
            <p className="text-muted-foreground">
              Here&apos;s what&apos;s happening with your documents today.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loading size="sm" /> : dashboardStats?.totalDocuments || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                No activity this month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Signatures</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loading size="sm" /> : dashboardStats?.pendingSignatures || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                None expiring soon
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loading size="sm" /> : dashboardStats?.completedDocuments || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                None this week
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loading size="sm" /> : `${Math.round(dashboardStats?.completionRate || 0)}%`}
              </div>
              <Progress 
                value={dashboardStats?.completionRate || 0} 
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="signatures">Signatures</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your latest document activities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documentsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-center space-x-4">
                            <div className="h-2 w-2 bg-muted rounded-full"></div>
                            <div className="flex-1 space-y-1">
                              <div className="h-4 w-3/4 bg-muted rounded"></div>
                              <div className="h-3 w-1/2 bg-muted rounded"></div>
                            </div>
                            <div className="h-5 w-16 bg-muted rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentDocuments.length > 0 ? (
                    recentDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center space-x-4">
                        <div className={`h-2 w-2 rounded-full ${
                          doc.status === 'COMPLETED' ? 'bg-green-600' :
                          doc.status === 'SENT' ? 'bg-yellow-500' :
                          doc.status === 'DRAFT' ? 'bg-gray-400' :
                          'bg-red-500'
                        }`}></div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {doc.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.updatedAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                        <Badge variant={doc.status === 'COMPLETED' ? 'default' : doc.status === 'SENT' ? 'outline' : 'secondary'}>
                          {doc.status.charAt(0) + doc.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                      <p className="text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Get started with these common tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DocumentUploadModal>
                    <Button className="w-full justify-start" variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </DocumentUploadModal>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Send for Signature
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => router.push("/dashboard/analytics")}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Documents</CardTitle>
                <CardDescription>
                  Manage all your documents in one place
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signatures" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Signature Requests</CardTitle>
                <CardDescription>
                  Track and manage signature requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignaturesTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}