import { BusinessProfileCard, BusinessProfileShell, ProfileState } from "@/components/business-profile-view";
import { useBusinessProfiles } from "@/hooks/use-business-profiles";
import { BUSINESS_TYPE_LABELS, type BusinessType } from "@/types/business-profiles";
import { Search, SlidersHorizontal, Store } from "lucide-react";

export default function BusinessProfilesPage() {
  const feed = useBusinessProfiles();
  return <BusinessProfileShell title="Cơ sở địa phương" onRefresh={feed.reload}>
    <main className="trade-flow__content business-profile-content">
      <div className="business-profile-directory-intro"><span><Store size={21} /></span><div><p>CỘNG ĐỒNG LOCALGO</p><h2>Gần bạn, đáng khám phá.</h2><small>Kết nối với những cơ sở tại địa phương.</small></div></div>
      <section className="business-profile-filters">
        <label className="business-profile-search"><span className="business-profile-sr-only">Tìm cơ sở</span><Search size={19} aria-hidden="true" /><input type="search" value={feed.keyword} placeholder="Tìm tên cơ sở, địa chỉ..." onChange={(e) => feed.setKeyword(e.target.value)} /></label>
        <div className="business-profile-filter-row"><span><SlidersHorizontal size={15} />Khám phá cơ sở</span><label><span className="business-profile-sr-only">Loại hình</span><select value={feed.businessType} onChange={(e) => feed.setBusinessType(e.target.value as BusinessType | "")}>
          <option value="">Tất cả loại hình</option>
          {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label></div>
      </section>
      <section className="business-profile-list" aria-label="Danh sách cơ sở">
        {feed.items.map((profile) => <BusinessProfileCard key={profile.id} profile={profile} />)}
        {feed.loading && <ProfileState loading />}
        {!feed.loading && feed.error && <ProfileState error={feed.error} onRetry={feed.retryError} />}
        {!feed.loading && !feed.error && !feed.items.length && <ProfileState empty="Chưa tìm thấy cơ sở phù hợp." />}
        {!feed.loading && !feed.error && feed.meta && feed.meta.page < feed.meta.totalPages && <button type="button" className="business-profile-load-more" onClick={() => void feed.loadMore()}>Xem thêm cơ sở</button>}
      </section>
    </main>
  </BusinessProfileShell>;
}
