import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate, useParams } from "zmp-ui";
import BusinessProfileView, { BusinessProfileShell, ProfileState } from "@/components/business-profile-view";
import { ApiRequestError, getApiErrorMessage } from "@/lib/http-client";
import { getBusinessProfileRevision, subscribeBusinessProfiles } from "@/lib/business-profile-cache";
import { getBusinessProfile } from "@/services/business-profiles";
import type { BusinessProfile } from "@/types/business-profiles";

export default function BusinessProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [retry, setRetry] = useState(0);
  const revision = useSyncExternalStore(subscribeBusinessProfiles, getBusinessProfileRevision);
  const reload = () => setRetry((value) => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setNotFound(false); setProfile(null);
    if (!id) { setNotFound(true); setLoading(false); return () => controller.abort(); }
    getBusinessProfile(id, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setProfile(result); })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiRequestError && e.status === 404) setNotFound(true);
        else setError(getApiErrorMessage(e));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, pathname, retry, revision]);
  return <BusinessProfileShell title="Thông tin cơ sở" onRefresh={reload}>
    <main className="trade-flow__content business-profile-content">
      {loading ? <ProfileState loading /> : notFound ? <><ProfileState empty="Hồ sơ không còn công khai hoặc đã được gỡ." /><button type="button" onClick={() => navigate("/business-profiles", { replace: true })}>Quay lại danh sách cơ sở</button></> : error ? <ProfileState error={error} onRetry={reload} /> : profile && <BusinessProfileView profile={profile} />}
    </main>
  </BusinessProfileShell>;
}
