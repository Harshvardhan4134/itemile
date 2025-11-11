import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockUsers = Array.from({ length: 5 }).map((_, index) => ({
  id: `user-${index}`,
  name: `User ${index + 1}`,
  email: `user${index + 1}@example.com`,
  Joined: "2025-01-01",
  trustScore: 80 - index * 5,
  flagsCount: index,
  systemRole: index === 0 ? "moderator" : "user",
  banned: false,
}));

const AdminUsers = () => {
  const users = useMemo(() => mockUsers, []);

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
          <Input placeholder="Search by email or phone" className="w-64" />
          <Button variant="outline">Filters</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2">User</th>
                  <th className="text-left font-medium px-4 py-2">Trust</th>
                  <th className="text-left font-medium px-4 py-2">Flags</th>
                  <th className="text-left font-medium px-4 py-2">Role</th>
                  <th className="text-left font-medium px-4 py-2">Status</th>
                  <th className="text-right font-medium px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        Trust {user.trustScore}/100
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{user.flagsCount}</td>
                    <td className="px-4 py-3 capitalize">{user.systemRole}</td>
                    <td className="px-4 py-3">
                      {user.banned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          Warn
                        </Button>
                        <Button variant="secondary" size="sm">
                          View Listings
                        </Button>
                        <Button variant="destructive" size="sm">
                          Ban
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;


