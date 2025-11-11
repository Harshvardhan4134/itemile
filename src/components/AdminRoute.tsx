import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthRole } from "@/hooks/useAuthRole";

interface AdminRouteProps {
  children: ReactNode;
  allowModerator?: boolean;
}

const AdminRoute = ({ children, allowModerator = true }: AdminRouteProps) => {
  const location = useLocation();
  const { user, role, loading } = useAuthRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    const redirectPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" state={{ from: redirectPath }} replace />;
  }

  const isAdmin = role === "admin";
  const isModerator = role === "moderator";
  const hasAccess = isAdmin || (allowModerator && isModerator);

  if (!hasAccess) {
    return <Navigate to="/explore" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;


