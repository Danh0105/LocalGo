import TradePostPricingFields from "@/components/trade/trade-post-pricing-fields";
import { getTradePostPurpose } from "@/lib/trade-post-presentation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Icon, Page, useLocation, useNavigate, useParams } from "zmp-ui";

import {
  BusinessProfileRequiredDialog,
  TradeLoginRequiredDialog,
} from "@/components/trade-access-dialogs";
import { useCurrentUser } from "@/contexts/auth-context";
import { useTradePostCategories } from "@/hooks/use-trade-post-categories";
import {
  expiryDateInputToIso,
  getMinExpiryDateInput,
  isoToExpiryDateInput,
} from "@/lib/trade-post-dates";
import {
  TradePostPayload,
  TradePostPriceType,
  TradePostRequestError,
  TradePostResponse,
  getMyTradePostDetail,
  updateTradePost,
} from "@/services/trade-posts";
import "../css/pages/trade.css";

const PHONE_PATTERN = /^(\+?84|0)[0-9]{9}$/;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function errorMessage(error: unknown): string {
  return error instanceof TradePostRequestError
    ? error.message
    : "Không thể cập nhật tin. Vui lòng thử lại.";
}

function TradeEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user, accessToken, status, authenticate } = useCurrentUser();
  const { categories, isLoading: isLoadingCategories } =
    useTradePostCategories();
  const [post, setPost] = useState<TradePostResponse | null>(null);
  const purpose = getTradePostPurpose(user?.businessType, post?.purpose);
  const isNonProfit = purpose === "NON_PROFIT";
  const [category, setCategory] = useState("");
  const [priceType, setPriceType] =
    useState<TradePostPriceType>("CONTACT");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState(
    () =>
      (location.state as { flashMessage?: string } | null)?.flashMessage ?? ""
  );
  const [expiresAtError, setExpiresAtError] = useState("");
  const minExpiryDate = useMemo(() => getMinExpiryDateInput(), []);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [businessOpen, setBusinessOpen] = useState(false);

  const hasAccess =
    status === "authenticated" &&
    user?.status === "ACTIVE" &&
    user.role === "BUSINESS" &&
    Boolean(accessToken);
  const selectedCategory = useMemo(
    () => categories.find((item) => item.code === category),
    [categories, category]
  );
  const requiresPromotion =
    !isNonProfit && selectedCategory?.requiresPromotionDetails === true;

  useEffect(() => {
    if (status === "idle" || status === "error") setLoginOpen(true);
    if (
      status === "authenticated" &&
      user &&
      (user.status !== "ACTIVE" || user.role !== "BUSINESS")
    ) {
      setBusinessOpen(true);
    }
  }, [status, user]);

  useEffect(() => {
    if (!hasAccess || !accessToken || !id) return;
    let active = true;
    setIsLoading(true);
    setLoadError("");
    void getMyTradePostDetail(accessToken, id)
      .then((result) => {
        if (!active) return;
        setPost(result);
        setCategory(result.category);
        setPriceType(result.priceType);
      })
      .catch((error) => {
        if (active) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, hasAccess, id]);

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const session = await authenticate({ requestUserInfoPermission: true });
      setLoginOpen(false);
      if (
        session.user.status !== "ACTIVE" ||
        session.user.role !== "BUSINESS"
      ) {
        setBusinessOpen(true);
      }
    } catch (error) {
      setLoginError(errorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!post || !accessToken || isSaving) return;
    const formData = new FormData(event.currentTarget);
    const title = text(formData, "title");
    const summary = text(formData, "summary");
    const description = text(formData, "description");
    const rawPrice = text(formData, "price");
    const address = text(formData, "address");
    const contactName = text(formData, "contactName");
    const contactPhone = text(formData, "contactPhone");
    const promotionPercentValue = text(formData, "promotionPercent");
    const promotionStartAt = toIsoDate(text(formData, "promotionStartAt"));
    const promotionEndAt = toIsoDate(text(formData, "promotionEndAt"));
    const expiresAtInput = text(formData, "expiresAt");
    const eventEndAtInput = isNonProfit ? text(formData, "eventEndAt") : "";
    const eventEndAt = toIsoDate(eventEndAtInput);
    const expiresAt = expiresAtInput
      ? expiryDateInputToIso(expiresAtInput)
      : null;

    setSaveError("");
    setExpiresAtError("");
    if (eventEndAtInput && !eventEndAt) {
      setSaveError("Thời gian kết thúc sự kiện không hợp lệ.");
      return;
    }
    if (
      expiresAtInput &&
      (!expiresAt || new Date(expiresAt).getTime() <= Date.now())
    ) {
      setExpiresAtError("Ngày hết hạn phải là một ngày trong tương lai.");
      return;
    }
    if (!selectedCategory) {
      setSaveError("Vui lòng chọn danh mục hợp lệ.");
      return;
    }
    if (!title || !summary || !description || !address || !contactName) {
      setSaveError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }
    if (!PHONE_PATTERN.test(contactPhone)) {
      setSaveError("Số điện thoại liên hệ không hợp lệ.");
      return;
    }
    const price = rawPrice ? Number(rawPrice) : null;
    if (!isNonProfit && priceType === "FIXED" && (!price || price <= 0)) {
      setSaveError("Giá cố định phải lớn hơn 0.");
      return;
    }
    const promotionPercent = promotionPercentValue
      ? Number(promotionPercentValue)
      : null;
    if (
      requiresPromotion &&
      (!promotionPercent || !promotionStartAt || !promotionEndAt)
    ) {
      setSaveError("Tin khuyến mãi cần đủ mức giảm và thời gian áp dụng.");
      return;
    }
    if (
      promotionStartAt &&
      promotionEndAt &&
      new Date(promotionStartAt) >= new Date(promotionEndAt)
    ) {
      setSaveError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    const payload: Partial<TradePostPayload> = {
      category,
      title,
      summary,
      description,
      purpose,
      ...(isNonProfit
        ? { eventEndAt }
        : {
            priceType,
            price: priceType === "FIXED" ? price : null,
            priceLabel: text(formData, "priceLabel") || null,
          }),
      address,
      contactName,
      contactPhone,
      contactZalo: text(formData, "contactZalo") || null,
      promotionPercent: requiresPromotion ? promotionPercent : null,
      promotionStartAt: requiresPromotion ? promotionStartAt : null,
      promotionEndAt: requiresPromotion ? promotionEndAt : null,
      expiresAt,
    };

    setIsSaving(true);
    try {
      await updateTradePost(accessToken, post.id, payload);
      navigate("/trade/manage", { replace: true });
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const header = (
    <header className="trade-header trade-create-header">
      <div className="trade-header__bar">
        <button className="trade-back" type="button" onClick={() => navigate(-1)}>
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <p>Kênh người bán</p>
          <h1>Chỉnh sửa tin</h1>
        </div>
      </div>
      <p className="trade-header__description">
        Cập nhật nội dung tin giao thương và thông tin liên hệ khách hàng.
      </p>
    </header>
  );

  const dialogs = (
    <>
      <TradeLoginRequiredDialog
        visible={loginOpen}
        loading={loginLoading}
        error={loginError}
        onLogin={() => void handleLogin()}
        onClose={() => navigate("/trade", { replace: true })}
      />
      <BusinessProfileRequiredDialog
        visible={businessOpen}
        zaloId={user?.zaloId}
        onClose={() => navigate("/trade", { replace: true })}
      />
    </>
  );

  if (!hasAccess || isLoading || !post || loadError) {
    return (
      <Page className="trade-flow-page trade-create-page">
        {header}
        <main className="trade-flow__content">
          <section className="trade-flow__status-card">
            <Icon icon={loadError ? "zi-warning" : "zi-clock-1"} />
            <h2>{loadError ? "Không thể mở tin" : "Đang tải thông tin"}</h2>
            <p>{loadError || "Vui lòng chờ trong giây lát."}</p>
            {loadError && (
              <button type="button" onClick={() => navigate("/trade/manage")}>
                Về trang quản lý
              </button>
            )}
          </section>
        </main>
        {dialogs}
      </Page>
    );
  }

  const locked = post.status === "PENDING" || post.status === "ARCHIVED";
  return (
    <Page className="trade-flow-page trade-create-page">
      {header}
      <main className="trade-flow__content">
        {locked ? (
          <section className="trade-flow__status-card trade-flow__status-card--pending">
            <Icon icon="zi-lock" />
            <h2>Tin hiện không thể chỉnh sửa</h2>
            <p>
              {post.status === "PENDING"
                ? "Tin đang chờ kiểm duyệt."
                : "Tin đã được lưu trữ."}
            </p>
            <button type="button" onClick={() => navigate("/trade/manage")}>
              Về trang quản lý
            </button>
          </section>
        ) : (
          <form className="trade-flow__form" onSubmit={handleSubmit}>
            <aside className="trade-create__intro">
              <Icon icon="zi-info-circle-solid" />
              <div>
                <strong>Ảnh hiện tại được giữ nguyên</strong>
                <p>
                  Thay đổi nội dung của tin đang hiển thị sẽ đưa tin về trạng
                  thái chờ duyệt để đảm bảo an toàn.
                </p>
              </div>
            </aside>

            <section className="trade-flow__form-card trade-create__form-card">
              <h2>Nội dung tin</h2>
              <label>
                <span className="trade-flow__label-text">Danh mục <i>*</i></span>
                <select value={category} disabled={isLoadingCategories} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((item) => <option value={item.code} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label><span className="trade-flow__label-text">Tiêu đề <i>*</i></span><input name="title" maxLength={200} defaultValue={post.title} required /></label>
              <label><span className="trade-flow__label-text">Tóm tắt <i>*</i></span><textarea name="summary" maxLength={500} rows={3} defaultValue={post.summary} required /></label>
              <label><span className="trade-flow__label-text">Nội dung chi tiết <i>*</i></span><textarea name="description" maxLength={5000} rows={7} defaultValue={post.description} required /></label>
            </section>

            <section className="trade-flow__form-card trade-create__form-card">
              <h2>{isNonProfit ? "Hoạt động và địa điểm" : "Giá và địa điểm"}</h2>
              <TradePostPricingFields
                nonProfit={isNonProfit}
                priceType={priceType}
                onPriceTypeChange={setPriceType}
                price={post.price}
                priceLabel={post.priceLabel}
                eventEndAt={post.eventEndAt}
              />
              <label><span className="trade-flow__label-text">Địa chỉ <i>*</i></span><textarea name="address" maxLength={300} rows={3} defaultValue={post.address} required /></label>
              <label>
                <span className="trade-flow__label-text">Ngày hết hạn</span>
                <input
                  name="expiresAt"
                  type="date"
                  min={minExpiryDate}
                  defaultValue={isoToExpiryDateInput(post.expiresAt)}
                />
                {expiresAtError && (
                  <span className="trade-flow__field-error" role="alert">
                    {expiresAtError}
                  </span>
                )}
              </label>
            </section>

            {requiresPromotion && (
              <section className="trade-flow__form-card trade-create__form-card">
                <h2>Thông tin khuyến mãi</h2>
                <label><span className="trade-flow__label-text">Phần trăm khuyến mãi <i>*</i></span><input name="promotionPercent" type="number" min="1" max="100" defaultValue={post.promotionPercent ?? ""} required /></label>
                <label><span className="trade-flow__label-text">Bắt đầu <i>*</i></span><input name="promotionStartAt" type="datetime-local" defaultValue={toLocalDateTime(post.promotionStartAt)} required /></label>
                <label><span className="trade-flow__label-text">Kết thúc <i>*</i></span><input name="promotionEndAt" type="datetime-local" defaultValue={toLocalDateTime(post.promotionEndAt)} required /></label>
              </section>
            )}

            <section className="trade-flow__form-card trade-create__form-card">
              <h2>Thông tin liên hệ</h2>
              <label><span className="trade-flow__label-text">Người liên hệ <i>*</i></span><input name="contactName" maxLength={120} defaultValue={post.contactName} required /></label>
              <label><span className="trade-flow__label-text">Số điện thoại <i>*</i></span><input name="contactPhone" inputMode="tel" defaultValue={post.contactPhone} required /></label>
              <label><span className="trade-flow__label-text">Zalo liên hệ</span><input name="contactZalo" maxLength={120} defaultValue={post.contactZalo ?? ""} /></label>
            </section>

            {saveError && <p className="trade-flow__message--error" role="alert">{saveError}</p>}
            <div className="trade-flow__actions">
              <button type="button" disabled={isSaving} onClick={() => navigate("/trade/manage")}>Hủy</button>
              <button type="submit" disabled={isSaving || isLoadingCategories}>
                <Icon icon="zi-check" />
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}
      </main>
      {dialogs}
    </Page>
  );
}

export default TradeEditPage;
