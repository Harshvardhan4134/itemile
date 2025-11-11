import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { getPendingKYCVerifications, approveKYCVerification, rejectKYCVerification, User } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, Shield } from 'lucide-react';

// Whitelist of admin emails
const ADMIN_EMAILS = [
  'rentshare11@gmail.com', 
  'admin@rentshare.com',
  'gharsha238@gmail.com' // Added G Harsha admin email
].map((email) => email.toLowerCase());

const isAdminEmail = (email?: string | null) =>
  typeof email === 'string' ? ADMIN_EMAILS.includes(email.toLowerCase()) : false;

export default function AdminKYC() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user || !isAdminEmail(user.email)) {
        toast.error('Unauthorized access');
        navigate('/');
      } else {
        setCurrentUser(user);
        loadPendingVerifications();
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadPendingVerifications = async () => {
    try {
      setLoading(true);
      const pendingUsers = await getPendingKYCVerifications();
      setUsers(pendingUsers);
    } catch (error) {
      console.error('Error loading verifications:', error);
      toast.error('Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user: User) => {
    setProcessing(true);
    try {
      await approveKYCVerification(user.uid);
      toast.success(`Approved verification for ${user.name}`);
      loadPendingVerifications();
    } catch (error) {
      console.error('Error approving verification:', error);
      toast.error('Failed to approve verification');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      await rejectKYCVerification(selectedUser.uid, rejectionReason);
      toast.success(`Rejected verification for ${selectedUser.name}`);
      setShowRejectDialog(false);
      setSelectedUser(null);
      setRejectionReason('');
      loadPendingVerifications();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast.error('Failed to reject verification');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toDate()).toLocaleDateString();
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin - KYC Verification</h1>
        </div>
        <p className="text-muted-foreground">
          Review and approve user verification requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Verifications ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No pending verifications
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.submittedAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Docs
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(user)}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRejectDialog(true);
                            }}
                            disabled={processing}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Documents Dialog */}
      <Dialog open={!!selectedUser && !showRejectDialog} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Documents - {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Review the uploaded documents carefully before approving or rejecting
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-6 py-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">{formatDate(selectedUser.submittedAt)}</p>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Aadhaar Card - Front</h4>
                  {selectedUser.aadharFrontUrl ? (
                    <>
                      <img
                        src={typeof selectedUser.aadharFrontUrl === 'string' 
                          ? selectedUser.aadharFrontUrl 
                          : (selectedUser.aadharFrontUrl as any).secure_url}
                        alt="Aadhaar Front"
                        className="w-full rounded-lg border"
                        onError={(e) => {
                          console.error('Failed to load Aadhaar Front');
                          e.currentTarget.style.display = 'none';
                          const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                          if (errorDiv) errorDiv.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm mb-2">⚠️ Image failed to load</p>
                        <p className="text-xs text-yellow-700">Old data detected. Please re-upload documents.</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Not uploaded</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Aadhaar Card - Back</h4>
                  {selectedUser.aadharBackUrl ? (
                    <img
                      src={typeof selectedUser.aadharBackUrl === 'string' 
                        ? selectedUser.aadharBackUrl 
                        : (selectedUser.aadharBackUrl as any).secure_url}
                      alt="Aadhaar Back"
                      className="w-full rounded-lg border"
                    />
                  ) : (
                    <p className="text-muted-foreground">Not uploaded</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">PAN Card</h4>
                  {selectedUser.panUrl ? (
                    <img
                      src={typeof selectedUser.panUrl === 'string' 
                        ? selectedUser.panUrl 
                        : (selectedUser.panUrl as any).secure_url}
                      alt="PAN Card"
                      className="w-full rounded-lg border"
                    />
                  ) : (
                    <p className="text-muted-foreground">Not uploaded</p>
                  )}
                </div>

                {selectedUser.selfieUrl && (
                  <div>
                    <h4 className="font-medium mb-2">Selfie (Optional)</h4>
                    <img
                      src={typeof selectedUser.selfieUrl === 'string' 
                        ? selectedUser.selfieUrl 
                        : (selectedUser.selfieUrl as any).secure_url}
                      alt="Selfie"
                      className="w-full rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this verification request
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., ID mismatch, unclear image, expired document..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Reject Verification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
