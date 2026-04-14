import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAllUsers,
  adjustUserTrustMetrics,
  logAdminAction,
  type User,
} from "@/lib/firestore";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { decryptSensitiveData } from "@/lib/encryption";
import {
  KYC_DOC_LABELS,
  KYC_DOC_ORDER,
  normalizeKycDocKeys,
  type KycDocKey,
} from "@/lib/verificationPolicy";
import {
  DollarSign,
  Copy,
  Check,
  Shield,
  Users,
  Filter,
  ListOrdered,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
    const code = (user.referralCode || "").toLowerCase();
    return (
      user.email.toLowerCase().includes(value) ||
      user.name.toLowerCase().includes(value) ||
      phone.toLowerCase().includes(value) ||
      code.includes(value)
    );
  });
};

type StatusFilter = "all" | "active" | "banned";
type RoleFilter = "all" | "user" | "moderator" | "admin";
type KycFilter = "all" | "required" | "exempt";
type ReferralAttrFilter = "all" | "has_signups" | "was_referred";

const applyUserFilters = (
  list: User[],
  opts: {
    status: StatusFilter;
    role: RoleFilter;
    kyc: KycFilter;
    referral: ReferralAttrFilter;
    referralCounts: Map<string, number>;
  }
) => {
  let out = list;
  if (opts.status === "active") out = out.filter((u) => !u.banned);
  if (opts.status === "banned") out = out.filter((u) => u.banned);
  if (opts.role !== "all") {
    out = out.filter((u) => (u.systemRole ?? "user") === opts.role);
  }
  if (opts.kyc === "required") out = out.filter((u) => !u.kycExempt);
  if (opts.kyc === "exempt") out = out.filter((u) => u.kycExempt === true);
  if (opts.referral === "has_signups") {
    out = out.filter((u) => (opts.referralCounts.get(u.uid) ?? 0) > 0);
  }
  if (opts.referral === "was_referred") {
    out = out.filter((u) => !!u.referredByUid);
  }
  return out;
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
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [kycPolicyUser, setKycPolicyUser] = useState<User | null>(null);
  const [verificationRequired, setVerificationRequired] = useState<"yes" | "no">("yes");
  const [docChoice, setDocChoice] = useState<Record<KycDocKey, boolean>>({
    aadharFront: true,
    aadharBack: true,
    pan: true,
    selfie: false,
  });
  const [kycSaving, setKycSaving] = useState(false);
  const [referralDialogUser, setReferralDialogUser] = useState<User | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [kycFilter, setKycFilter] = useState<KycFilter>("all");
  const [referralAttrFilter, setReferralAttrFilter] =
    useState<ReferralAttrFilter>("all");
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

  /** Signups attributed to each referrer (referredByUid → count) */
  const referralCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of users) {
      if (u.referredByUid) {
        m.set(u.referredByUid, (m.get(u.referredByUid) ?? 0) + 1);
      }
    }
    return m;
  }, [users]);

  const referralsByReferrer = useMemo(() => {
    const m = new Map<string, User[]>();
    for (const u of users) {
      if (!u.referredByUid) continue;
      const list = m.get(u.referredByUid) ?? [];
      list.push(u);
      m.set(u.referredByUid, list);
    }
    for (const [, list] of m) {
      list.sort((a, b) => {
        const ta =
          typeof a.createdAt?.toDate === "function"
            ? a.createdAt.toDate().getTime()
            : new Date(a.createdAt as string).getTime() || 0;
        const tb =
          typeof b.createdAt?.toDate === "function"
            ? b.createdAt.toDate().getTime()
            : new Date(b.createdAt as string).getTime() || 0;
        return tb - ta;
      });
    }
    return m;
  }, [users]);

  const usersByUid = useMemo(
    () => new Map(users.map((u) => [u.uid, u])),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const searched = filterUsers(users, search);
    return applyUserFilters(searched, {
      status: statusFilter,
      role: roleFilter,
      kyc: kycFilter,
      referral: referralAttrFilter,
      referralCounts,
    });
  }, [
    users,
    search,
    statusFilter,
    roleFilter,
    kycFilter,
    referralAttrFilter,
    referralCounts,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter !== "all") n++;
    if (roleFilter !== "all") n++;
    if (kycFilter !== "all") n++;
    if (referralAttrFilter !== "all") n++;
    return n;
  }, [statusFilter, roleFilter, kycFilter, referralAttrFilter]);

  const resetFilters = () => {
    setStatusFilter("all");
    setRoleFilter("all");
    setKycFilter("all");
    setReferralAttrFilter("all");
  };

  const handleViewListings = (user: User) => {
    // Navigate to admin listings page with owner filter
    navigate(`/admin/listings?owner=${user.uid}`);
  };

  const openKycPolicyDialog = (user: User) => {
    setKycPolicyUser(user);
    const exempt = user.kycExempt === true;
    setVerificationRequired(exempt ? "no" : "yes");
    const keys = normalizeKycDocKeys(user.kycRequiredDocKeys);
    setDocChoice({
      aadharFront: keys.includes("aadharFront"),
      aadharBack: keys.includes("aadharBack"),
      pan: keys.includes("pan"),
      selfie: keys.includes("selfie"),
    });
    setKycDialogOpen(true);
  };

  const handleSaveKycPolicy = async () => {
    if (!kycPolicyUser || !adminUser) return;

    if (verificationRequired === "yes") {
      const selected = KYC_DOC_ORDER.filter((k) => docChoice[k]);
      if (selected.length === 0) {
        toast({
          title: "Pick at least one document",
          description: "When verification is required, choose which documents the user must upload.",
          variant: "destructive",
        });
        return;
      }
      setKycSaving(true);
      try {
        await updateDoc(doc(db, "users", kycPolicyUser.uid), {
          kycExempt: false,
          kycRequiredDocKeys: selected,
        });
        await logAdminAction({
          actorId: adminUser.uid,
          action: "VERIFY",
          targetType: "user",
          targetId: kycPolicyUser.uid,
          reason: "KYC policy: verification required",
          metadata: { kycRequiredDocKeys: selected },
        });
        toast({
          title: "Saved",
          description: "This user must complete verification with the selected documents.",
        });
        setKycDialogOpen(false);
        await loadUsers();
      } catch (e) {
        console.error(e);
        toast({ title: "Save failed", variant: "destructive" });
      } finally {
        setKycSaving(false);
      }
      return;
    }

    setKycSaving(true);
    try {
      await updateDoc(doc(db, "users", kycPolicyUser.uid), {
        kycExempt: true,
        kycRequiredDocKeys: [],
      });
      await logAdminAction({
        actorId: adminUser.uid,
        action: "VERIFY",
        targetType: "user",
        targetId: kycPolicyUser.uid,
        reason: "KYC policy: verification not required",
        metadata: {},
      });
      toast({
        title: "Saved",
        description: "This user does not need to submit verification.",
      });
      setKycDialogOpen(false);
      await loadUsers();
    } catch (e) {
      console.error(e);
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setKycSaving(false);
    }
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
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search name, email, phone, or referral code"
            className="w-64 max-w-full sm:max-w-xs md:w-72"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 shrink-0">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-0.5 rounded-full px-1.5 py-0 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="font-medium text-sm">Filter users</div>
                <p className="text-xs text-muted-foreground">
                  Combined with the search box above.
                </p>
                <div className="space-y-2">
                  <Label className="text-xs">Account status</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as StatusFilter)
                    }
                  >
                    <option value="all">All</option>
                    <option value="active">Active only</option>
                    <option value="banned">Banned only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Role</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={roleFilter}
                    onChange={(e) =>
                      setRoleFilter(e.target.value as RoleFilter)
                    }
                  >
                    <option value="all">All roles</option>
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">KYC</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={kycFilter}
                    onChange={(e) => setKycFilter(e.target.value as KycFilter)}
                  >
                    <option value="all">All</option>
                    <option value="required">Verification required</option>
                    <option value="exempt">KYC exempt</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Referrals</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={referralAttrFilter}
                    onChange={(e) =>
                      setReferralAttrFilter(e.target.value as ReferralAttrFilter)
                    }
                  >
                    <option value="all">All</option>
                    <option value="has_signups">Has referral signups</option>
                    <option value="was_referred">Signed up with a code</option>
                  </select>
                </div>
                <Separator />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    resetFilters();
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
                    <th className="text-left font-medium px-4 py-2">Referral</th>
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
                        colSpan={8}
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
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono text-xs">
                            {user.referralCode || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {referralCounts.get(user.uid) ?? 0} signups via code
                          </div>
                          {(referralCounts.get(user.uid) ?? 0) > 0 && (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0 text-xs text-primary"
                              onClick={() => setReferralDialogUser(user)}
                            >
                              <ListOrdered className="h-3 w-3 mr-1 inline" />
                              View signups
                            </Button>
                          )}
                          {user.referredByUid && (
                            <div
                              className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[180px]"
                              title={
                                usersByUid.get(user.referredByUid)?.email ??
                                user.referredByUid
                              }
                            >
                              Referred by:{" "}
                              {usersByUid.get(user.referredByUid)?.name ??
                                `${user.referredByUid.slice(0, 8)}…`}
                            </div>
                          )}
                          <div className="mt-1.5">
                            {user.kycExempt ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                KYC exempt
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                KYC required
                              </Badge>
                            )}
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
                              variant="outline"
                              size="sm"
                              onClick={() => openKycPolicyDialog(user)}
                              disabled={user.banned}
                              title="Verification required or exempt, and required documents"
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              KYC
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => handleViewListings(user)}
                            >
                              View Listings
                            </Button>
                            {user.payoutDetails && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setPayoutDialogOpen(true);
                                }}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Payout
                              </Button>
                            )}
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

      <Dialog
        open={!!referralDialogUser}
        onOpenChange={(open) => !open && setReferralDialogUser(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referral signups
            </DialogTitle>
            <DialogDescription>
              People who joined using{" "}
              <span className="font-mono font-medium text-foreground">
                {referralDialogUser?.referralCode ?? "—"}
              </span>{" "}
              from{" "}
              <span className="font-medium text-foreground">
                {referralDialogUser?.name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[min(360px,50vh)] pr-3">
            <ul className="space-y-3 text-sm">
              {(() => {
                const signups = referralDialogUser
                  ? referralsByReferrer.get(referralDialogUser.uid) ?? []
                  : [];
                if (signups.length === 0) {
                  return (
                    <li className="text-muted-foreground text-sm py-4 text-center list-none">
                      No signups recorded.
                    </li>
                  );
                }
                return signups.map((u) => (
                  <li
                    key={u.uid}
                    className="rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Joined {formatDate(u.createdAt)} · uid {u.uid.slice(0, 8)}…
                    </div>
                  </li>
                ));
              })()}
            </ul>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReferralDialogUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC policy: exempt vs required + document checklist */}
      <Dialog open={kycDialogOpen} onOpenChange={setKycDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verification policy</DialogTitle>
            <DialogDescription>
              User:{" "}
              <span className="font-medium text-foreground">{kycPolicyUser?.name}</span> (
              {kycPolicyUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <RadioGroup
              value={verificationRequired}
              onValueChange={(v) => setVerificationRequired(v as "yes" | "no")}
              className="gap-3"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="yes" id="kyc-req-yes" className="mt-0.5" />
                <div>
                  <Label htmlFor="kyc-req-yes" className="font-medium cursor-pointer">
                    Yes — verification required
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    User must submit documents before renting, paying, or posting requests.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="no" id="kyc-req-no" className="mt-0.5" />
                <div>
                  <Label htmlFor="kyc-req-no" className="font-medium cursor-pointer">
                    No — verification not required
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    User can use the app without submitting KYC documents.
                  </p>
                </div>
              </div>
            </RadioGroup>

            {verificationRequired === "yes" && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Required documents</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Choose which uploads are mandatory before review.
                </p>
                <div className="grid gap-2">
                  {KYC_DOC_ORDER.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`kyc-doc-${key}`}
                        checked={docChoice[key]}
                        onCheckedChange={(checked) =>
                          setDocChoice((prev) => ({ ...prev, [key]: !!checked }))
                        }
                      />
                      <Label htmlFor={`kyc-doc-${key}`} className="text-sm font-normal cursor-pointer">
                        {KYC_DOC_LABELS[key]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKycDialogOpen(false)} disabled={kycSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveKycPolicy} disabled={kycSaving}>
              {kycSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Payout Details Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payout Details - {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              View and manage payout information for manual payouts. All sensitive data is decrypted for admin access only.
            </DialogDescription>
          </DialogHeader>
          {selectedUser?.payoutDetails ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Payout Method</Label>
                  <div className="mt-1 font-medium">
                    {selectedUser.payoutDetails.payoutMethod === 'upi' ? 'UPI' : 'Bank Account'}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedUser.payoutDetails.lastUpdated 
                      ? formatDate(selectedUser.payoutDetails.lastUpdated)
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">Account Holder Name</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-medium">
                      {decryptSensitiveData(selectedUser.payoutDetails.accountHolderName || '')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(decryptSensitiveData(selectedUser.payoutDetails?.accountHolderName || ''));
                        setCopiedField('name');
                        setTimeout(() => setCopiedField(null), 2000);
                        toast({ title: "Copied!", description: "Account holder name copied to clipboard" });
                      }}
                    >
                      {copiedField === 'name' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-medium">
                      {decryptSensitiveData(selectedUser.payoutDetails.phone || '')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(decryptSensitiveData(selectedUser.payoutDetails?.phone || ''));
                        setCopiedField('phone');
                        setTimeout(() => setCopiedField(null), 2000);
                        toast({ title: "Copied!", description: "Phone number copied to clipboard" });
                      }}
                    >
                      {copiedField === 'phone' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {selectedUser.payoutDetails.payoutMethod === 'upi' && selectedUser.payoutDetails.upiId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">UPI ID</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-medium">
                        {decryptSensitiveData(selectedUser.payoutDetails.upiId)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(decryptSensitiveData(selectedUser.payoutDetails?.upiId || ''));
                          setCopiedField('upi');
                          setTimeout(() => setCopiedField(null), 2000);
                          toast({ title: "Copied!", description: "UPI ID copied to clipboard" });
                        }}
                      >
                        {copiedField === 'upi' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {selectedUser.payoutDetails.payoutMethod === 'bank_account' && (
                  <>
                    {selectedUser.payoutDetails.accountNumber && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Account Number</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-medium">
                            {decryptSensitiveData(selectedUser.payoutDetails.accountNumber)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              navigator.clipboard.writeText(decryptSensitiveData(selectedUser.payoutDetails?.accountNumber || ''));
                              setCopiedField('account');
                              setTimeout(() => setCopiedField(null), 2000);
                              toast({ title: "Copied!", description: "Account number copied to clipboard" });
                            }}
                          >
                            {copiedField === 'account' ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedUser.payoutDetails.ifscCode && (
                      <div>
                        <Label className="text-xs text-muted-foreground">IFSC Code</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-medium">
                            {decryptSensitiveData(selectedUser.payoutDetails.ifscCode)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              navigator.clipboard.writeText(decryptSensitiveData(selectedUser.payoutDetails?.ifscCode || ''));
                              setCopiedField('ifsc');
                              setTimeout(() => setCopiedField(null), 2000);
                              toast({ title: "Copied!", description: "IFSC code copied to clipboard" });
                            }}
                          >
                            {copiedField === 'ifsc' ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedUser.payoutDetails.bankName && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Bank Name</Label>
                        <div className="mt-1 font-medium">
                          {decryptSensitiveData(selectedUser.payoutDetails.bankName)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedUser.payoutDetails.payoutReferences && selectedUser.payoutDetails.payoutReferences.length > 0 && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-semibold">Payout History</Label>
                    <div className="mt-2 space-y-2">
                      {selectedUser.payoutDetails.payoutReferences.map((ref, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">₹{ref.amount?.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">
                                {ref.utr && `UTR: ${ref.utr}`}
                                {ref.date && ` • ${formatDate(ref.date)}`}
                              </div>
                            </div>
                            <Badge variant={ref.status === 'completed' ? 'default' : ref.status === 'failed' ? 'destructive' : 'secondary'}>
                              {ref.status || 'pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payout details added yet.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
