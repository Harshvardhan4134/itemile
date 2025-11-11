import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllUsers, type User } from "@/lib/firestore";

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

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await getAllUsers();
        if (active) {
          setUsers(data);
        }
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadUsers();
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(
    () => filterUsers(users, search),
    [users, search]
  );

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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
