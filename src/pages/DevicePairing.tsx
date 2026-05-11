import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { approveDevicePairingSession } from "../lib/devicePairing";
import { getCurrentUser, hasSession } from "../lib/auth";
import { storePostLoginRedirect } from "../lib/authRedirect";

export default function DevicePairing() {
  const nav = useNavigate();
  const location = useLocation();
  const params = useParams();
  const search = new URLSearchParams(location.search);

  const pairingToken =
    search.get("token") || params.pairingToken || "";

  useEffect(() => {
    if (!pairingToken) {
      nav("/app", { replace: true });
      return;
    }

    if (!hasSession()) {
      // Not logged in — save this URL and send to login.
      storePostLoginRedirect(`${location.pathname}${location.search}`);
      nav("/login", { replace: true });
      return;
    }

    // Already logged in — approve silently and go straight to /app.
    const user = getCurrentUser();
    void approveDevicePairingSession(pairingToken, user).catch(() => {});
    nav("/app", { replace: true });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
