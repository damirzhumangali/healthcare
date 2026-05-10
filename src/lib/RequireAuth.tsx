import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  hasSession,
  requiresServerSessionValidation,
  syncSessionFromServer,
} from "./auth";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const shouldValidateOnServer = requiresServerSessionValidation();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(() => {
    if (!shouldValidateOnServer) {
      return hasSession() ? "allowed" : "denied";
    }

    return "checking";
  });

  useEffect(() => {
    if (!shouldValidateOnServer) {
      setStatus(hasSession() ? "allowed" : "denied");
      return;
    }

    let cancelled = false;

    syncSessionFromServer()
      .then((user) => {
        if (cancelled) return;
        setStatus(user ? "allowed" : "denied");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("denied");
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, shouldValidateOnServer]);

  if (status === "checking") {
    return (
      <div className="center min-h-screen">
        <div className="muted">Проверяем сессию...</div>
      </div>
    );
  }

  if (status !== "allowed") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
