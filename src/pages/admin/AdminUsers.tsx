import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllUsers, adjustUserTrustMetrics, logAdminAction, type User } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuthRole } from "@/hooks/useAuthRole";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const formatDate = (value: any) => {
  if (!value) return "—";
  try {
    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleDateString();
    }
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
};

const filterUsers = (users: User[], term: string) => {
  if (!term.trim()) return users;
  const value = term.toLowerCase();
  return users.filter((user) => {
    const phone = typeof user.phone === "string" ? user.phone : "";
    return (
      user.email.toLowerCase().includes(value) ||
      user.name.toLowerCase().includes(value) ||
      phone.toLowerCase().includes(value)
    );
  });
};

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: adminUser } = useAuthRole();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users", error);
      toast({
        title: "Failed to load users",
        description: "Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(
    () => filterUsers(users, search),
    [users, search]
  );

  const handleViewListings = (user: User) => {
    // Navigate to admin listings page with owner filter
    navigate(`/admin/listings?owner=${user.uid}`);
  };

  const openWarnDialog = (user: User) => {
    setSelectedUser(user);
    setActionReason("");
    setWarnDialogOpen(true);
  };

  const openBanDialog = (user: User) => {
    setSelectedUser(user);
    setActionReason("");
    setBanDialogOpen(true);
  };

  const handleWarnConfirm = async () => {
    if (!selectedUser || !adminUser) {
      toast({
        title: "Unable to warn user",
        description: "Admin session not detected.",
        variant: "destructive",
      });
      return;
    }

    if (!actionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for the warning.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      // Reduce trust score by 5 points
      await adjustUserTrustMetrics(selectedUser.uid, -5, 0);

      // Log admin action
      await logAdminAction({
        actorId: adminUser.uid,
        action: "WARN",
        targetType: "user",
        targetId: selectedUser.uid,
        reason: actionReason.trim(),
        metadata: {
          userEmail: selectedUser.email,
        },
      });

      toast({
        title: "User warned",
        description: `Warning issued to ${selectedUser.email}. Trust score reduced by 5 points.`,
      });

      setWarnDialogOpen(false);
      await loadUsers();
    } catch (error) {
      console.error("Failed to warn user", error);
      toast({
        title: "Failed to warn user",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanConfirm = async () => {
    if (!selectedUser || !adminUser) {
      toast({
        title: "Unable to ban user",
        description: "Admin session not detected.",
        variant: "destructive",
      });
      return;
    }

    if (!actionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for the ban.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      // Set user as banned and set trust score to 0
      const userRef = doc(db, "users", selectedUser.uid);
      await updateDoc(userRef, {
        banned: true,
        trustScore: 0,
      });

      // Log admin action
      await logAdminAction({
        actorId: adminUser.uid,
        action: "BAN",
        targetType: "user",
        targetId: selectedUser.uid,
        reason: actionReason.trim(),
        metadata: {
          userEmail: selectedUser.email,
        },
      });

      toast({
        title: "User banned",
        description: `${selectedUser.email} has been banned from the platform.`,
      });

      setBanDialogOpen(false);
      await loadUsers();
    } catch (error) {
      console.error("Failed to ban user", error);
      toast({
        title: "Failed to ban user",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">
            Audit member activity, trust levels, and take actions when needed.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search by email, name, or phone"
            className="w-64"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button variant="outline">Filters</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading users…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">User</th>
                    <th className="text-left font-medium px-4 py-2">Trust</th>
                    <th className="text-left font-medium px-4 py-2">Flags</th>
                    <th className="text-left font-medium px-4 py-2">Role</th>
                    <th className="text-left font-medium px-4 py-2">Joined</th>
                    <th className="text-left font-medium px-4 py-2">Status</th>
                    <th className="text-right font-medium px-4 py-2">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-sm text-muted-foreground"
                      >
                        No users found. Try adjusting your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.uid} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            Trust {user.trustScore ?? 50}/100
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{user.flagsCount ?? 0}</td>
                        <td className="px-4 py-3 capitalize">
                          {user.systemRole ?? "user"}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {user.banned ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openWarnDialog(user)}
                              disabled={user.banned}
                            >
                              Warn
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => handleViewListings(user)}
                            >
                              View Listings
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => openBanDialog(user)}
                              disabled={user.banned}
                            >
                              {user.banned ? "Banned" : "Ban"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning Dialog */}
      <Dialog open={warnDialogOpen} onOpenChange={setWarnDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Warn User</DialogTitle>
            <DialogDescription>
              Issue a warning to{" "}
              <span className="font-semibold">{selectedUser?.email}</span>. This
              will reduce their trust score by 5 points and be recorded in the audit
              log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="warn-reason">Reason for warning *</Label>
              <Textarea
                id="warn-reason"
                placeholder="Explain why this user is being warned (e.g., inappropriate listing, spam, policy violation)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWarnDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleWarnConfirm}
              disabled={actionLoading || !actionReason.trim()}
            >
              {actionLoading ? "Warning..." : "Confirm Warning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Permanently ban{" "}
              <span className="font-semibold">{selectedUser?.email}</span> from the
              platform. This will set their trust score to 0 and prevent them from
              using RentShare. This action should only be used for serious violations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ban-reason">Reason for ban *</Label>
              <Textarea
                id="ban-reason"
                placeholder="Provide a detailed reason for the ban (e.g., repeated violations, fraud, illegal activity)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanConfirm}
              disabled={actionLoading || !actionReason.trim()}
            >
              {actionLoading ? "Banning..." : "Confirm Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
