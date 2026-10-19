import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import PreviewableImage from "@/components/previewable-image";
import {
  BusinessProfileRequiredDialog,
  TradeLoginRequiredDialog,
} from "@/components/trade-access-dialogs";
import { useCurrentUser } from "@/contexts/auth-context";
import { useTradePostCategories } from "@/hooks/use-trade-post-categories";
import {
  expiryDateInputToIso,
  getMinExpiryDateInput,
} from "@/lib/trade-post-dates";
import {
  TRADE_POST_CATEGORY_INVALID_MESSAGE,
  TradePostPayload,
  TradePostPriceType,
  TradePostRequestError,
  TradePostResponse,
  createTradePost,
  isTradePostCategoryInvalidError,
  isTradePostExpiredError,
  submitTradePost,
  uploadTradePostImage,
} from "@/services/trade-posts";
import "../css/pages/trade.css";

type SubmitIntent = "draft" | "submit";
type BusinessDialogSource = "gate" | "submit";

interface SelectedTradeImage {
  file: File;
  key: string;
  previewUrl: string;
}

const PHONE_PATTERN = /^(\+?84|0)[0-9]{9}$/;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 10;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function toIsoDate(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function TradeCreatePage() {
  const navigate = useNavigate();
  const {
    user,
    accessToken,
    status: authStatus,
    error: authError,
    authenticate,
    refreshUser,
  } = useCurrentUser();
  const {
    categories,
    isLoading: isLoadingCategories,
    error: categoryLoadError,
    reload: reloadCategories,
  } = useTradePostCategories();
  const [category, setCategory] = useState("");
  const [priceType, setPriceType] = useState<TradePostPriceType>("CONTACT");
  const [promotionPercentValue, setPromotionPercentValue] = useState("");
  const [promotionStartAtValue, setPromotionStartAtValue] = useState("");
  const [promotionEndAtValue, setPromotionEndAtValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<TradePostResponse | null>(null);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [hasBusinessAccess, setHasBusinessAccess] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [businessDialogSource, setBusinessDialogSource] =
    useState<BusinessDialogSource | null>(null);
  const [selectedImages, setSelectedImages] = useState<SelectedTradeImage[]>([]);
  const [imageError, setImageError] = useState("");
  const [expiresAtError, setExpiresAtError] = useState("");
  const minExpiryDate = useMemo(() => getMinExpiryDateInput(), []);
  const submitIntent = useRef<SubmitIntent>("draft");
  const selectedImagesRef = useRef<SelectedTradeImage[]>([]);
  const hasRefreshedUserRef = useRef(false);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.code === category),
    [categories, category]
  );
  const requiresPromotionDetails =
    selectedCategory?.requiresPromotionDetails === true;

  useEffect(() => {
    if (authStatus === "idle") {
      setLoginDialogOpen(true);
    }
  }, [authStatus]);

  // Re-fetch the current user when opening the posting form so a business
  // profile that an admin just approved is reflected immediately.
  useEffect(() => {
    if (authStatus === "authenticated" && !hasRefreshedUserRef.current) {
      hasRefreshedUserRef.current = true;
      void refreshUser().catch(() => undefined);
    }
  }, [authStatus, refreshUser]);

  useEffect(() => {
    if (isLoadingCategories) return;
    setCategory((current) =>
      categories.some((item) => item.code === current)
        ? current
        : (categories[0]?.code ?? "")
    );
  }, [categories, isLoadingCategories]);

  useEffect(() => {
    if (requiresPromotionDetails) return;
    setPromotionPercentValue("");
    setPromotionStartAtValue("");
    setPromotionEndAtValue("");
  }, [requiresPromotionDetails]);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(
    () => () => {
      selectedImagesRef.current.forEach(({ previewUrl }) =>
        URL.revokeObjectURL(previewUrl)
      );
    },
    []
  );

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;

    if (user.status !== "ACTIVE") {
      setHasBusinessAccess(false);
      return;
    }

    if (user.role === "BUSINESS") {
      setHasBusinessAccess(true);
      setBusinessDialogSource(null);
      return;
    }

    setHasBusinessAccess(false);
    setBusinessDialogSource("gate");
  }, [authStatus, user]);

  const handleLogin = async () => {
    if (isAuthenticating) return;

    setLoginError("");
    setIsAuthenticating(true);
    try {
      const session = await authenticate({ requestUserInfoPermission: true });
      setLoginDialogOpen(false);
      if (
        session.user.status === "ACTIVE" &&
        session.user.role !== "BUSINESS"
      ) {
        setBusinessDialogSource("gate");
      }
    } catch {
      setLoginError(
        "Bạn cần đăng nhập và cấp quyền truy cập thông tin Zalo để đăng tin."
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const addImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const invalidTypeCount = files.filter(
      (file) => !ALLOWED_IMAGE_TYPES.has(file.type)
    ).length;
    const oversizedCount = files.filter(
      (file) => ALLOWED_IMAGE_TYPES.has(file.type) && file.size > MAX_IMAGE_SIZE
    ).length;
    const existingKeys = new Set(selectedImages.map(({ key }) => key));
    const incomingKeys = new Set<string>();
    let duplicateCount = 0;

    const validImages = files.flatMap((file) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE) {
        return [];
      }

      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (existingKeys.has(key) || incomingKeys.has(key)) {
        duplicateCount += 1;
        return [];
      }
      incomingKeys.add(key);
      return [{ file, key }];
    });

    const remainingSlots = MAX_IMAGES - selectedImages.length;
    const acceptedImages = validImages.slice(0, remainingSlots).map((image) => ({
      ...image,
      previewUrl: URL.createObjectURL(image.file),
    }));
    const overLimitCount = validImages.length - acceptedImages.length;

    if (acceptedImages.length > 0) {
      setSelectedImages((current) => [...current, ...acceptedImages]);
    }

    const errors: string[] = [];
    if (invalidTypeCount > 0) {
      errors.push(`${invalidTypeCount} tệp không phải ảnh JPG, PNG hoặc WebP.`);
    }
    if (oversizedCount > 0) {
      errors.push(`${oversizedCount} ảnh vượt quá dung lượng 5MB.`);
    }
    if (duplicateCount > 0) {
      errors.push(`${duplicateCount} ảnh trùng đã được bỏ qua.`);
    }
    if (overLimitCount > 0) {
      errors.push(`Chỉ thêm ảnh đến giới hạn ${MAX_IMAGES} ảnh.`);
    }
    setImageError(errors.join(" "));
  };

  const removeImage = (key: string) => {
    setSelectedImages((current) => {
      const removedImage = current.find((image) => image.key === key);
      if (removedImage) URL.revokeObjectURL(removedImage.previewUrl);
      return current.filter((image) => image.key !== key);
    });
    setImageError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !accessToken ||
      !user ||
      user.status !== "ACTIVE" ||
      !hasBusinessAccess
    ) {
      if (!accessToken || !user) {
        setLoginDialogOpen(true);
      } else if (user.status !== "ACTIVE") {
        setSubmitError(
          "Tài khoản của bạn chưa hoạt động. Vui lòng liên hệ quản trị viên."
        );
      } else {
        setBusinessDialogSource("gate");
      }
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = text(formData, "title");
    const summary = text(formData, "summary");
    const description = text(formData, "description");
    const address = text(formData, "address");
    const contactName = text(formData, "contactName");
    const contactPhone = text(formData, "contactPhone");
    const contactZalo = text(formData, "contactZalo");
    const priceLabel = text(formData, "priceLabel");
    const rawPrice = text(formData, "price");
    const promotionStartAt = toIsoDate(promotionStartAtValue);
    const promotionEndAt = toIsoDate(promotionEndAtValue);
    const expiresAtInput = text(formData, "expiresAt");
    const expiresAt = expiresAtInput
      ? expiryDateInputToIso(expiresAtInput)
      : null;
    const images = selectedImages.map(({ file }) => file);

    setSubmitError("");
    setExpiresAtError("");

    if (expiresAtInput && (!expiresAt || new Date(expiresAt).getTime() <= Date.now())) {
      setExpiresAtError("Ngày hết hạn phải là một ngày trong tương lai.");
      return;
    }

    if (!category || !selectedCategory) {
      setSubmitError("Vui lòng chọn danh mục tin hợp lệ.");
      return;
    }

    if (!title || title.length > 200) {
      setSubmitError("Tiêu đề cần từ 1-200 ký tự.");
      return;
    }
    if (!summary || summary.length > 500) {
      setSubmitError("Tóm tắt cần từ 1-500 ký tự.");
      return;
    }
    if (!description || description.length > 5000) {
      setSubmitError("Nội dung chi tiết cần từ 1-5.000 ký tự.");
      return;
    }
    if (!address || address.length > 300) {
      setSubmitError("Địa chỉ cần từ 1-300 ký tự.");
      return;
    }
    if (!contactName || contactName.length > 120) {
      setSubmitError("Tên người liên hệ cần từ 1-120 ký tự.");
      return;
    }
    if (!PHONE_PATTERN.test(contactPhone)) {
      setSubmitError("Số điện thoại liên hệ không hợp lệ.");
      return;
    }
    if (priceLabel.length > 100) {
      setSubmitError("Nhãn giá không được vượt quá 100 ký tự.");
      return;
    }

    const price = rawPrice ? Number(rawPrice) : undefined;
    if (priceType === "FIXED" && (!price || price <= 0)) {
      setSubmitError("Giá cố định phải lớn hơn 0.");
      return;
    }

    const promotionPercent = promotionPercentValue
      ? Number(promotionPercentValue)
      : undefined;
    if (
      requiresPromotionDetails &&
      (!promotionPercent ||
        promotionPercent < 1 ||
        promotionPercent > 100 ||
        !promotionStartAt ||
        !promotionEndAt)
    ) {
      setSubmitError("Tin khuyến mãi cần phần trăm và thời gian bắt đầu/kết thúc hợp lệ.");
      return;
    }
    if (
      requiresPromotionDetails &&
      promotionStartAt &&
      promotionEndAt &&
      new Date(promotionStartAt).getTime() >= new Date(promotionEndAt).getTime()
    ) {
      setSubmitError("Thời gian kết thúc khuyến mãi phải sau thời gian bắt đầu.");
      return;
    }

    if (images.length > MAX_IMAGES) {
      setSubmitError(`Chỉ được tải tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }
    if (images.some((file) => !ALLOWED_IMAGE_TYPES.has(file.type))) {
      setSubmitError("Ảnh tin đăng chỉ hỗ trợ JPG, PNG hoặc WebP.");
      return;
    }
    if (images.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setSubmitError("Mỗi ảnh tin đăng không được vượt quá 5MB.");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedImages = await Promise.all(
        images.map((file) => uploadTradePostImage(accessToken, file))
      );
      const payload: TradePostPayload = {
        category,
        title,
        summary,
        description,
        priceType,
        ...(priceType === "FIXED" && price !== undefined ? { price } : {}),
        ...(priceLabel ? { priceLabel } : {}),
        address,
        contactName,
        contactPhone,
        ...(contactZalo ? { contactZalo } : {}),
        ...(uploadedImages.length
          ? { imageIds: uploadedImages.map((image) => image.id) }
          : {}),
        ...(requiresPromotionDetails && promotionPercent
          ? { promotionPercent, promotionStartAt, promotionEndAt }
          : {}),
        ...(expiresAt ? { expiresAt } : {}),
      };

      const created = await createTradePost(accessToken, payload);
      selectedImages.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      setSelectedImages([]);
      if (submitIntent.current === "submit") {
        try {
          const submitted = await submitTradePost(accessToken, created.id);
          setResult(submitted);
          setSubmitFailed(false);
        } catch (error: unknown) {
          if (isTradePostExpiredError(error)) {
            navigate(`/trade/manage/posts/${created.id}/edit`, {
              state: {
                flashMessage: "Tin đã quá ngày hết hạn, vui lòng cập nhật.",
              },
            });
            return;
          }
          setResult(created);
          setSubmitFailed(true);
          if (isTradePostCategoryInvalidError(error)) {
            setCategory("");
            reloadCategories();
          }
          setSubmitError(
            isTradePostCategoryInvalidError(error)
              ? `Tin đã được lưu nháp nhưng chưa gửi duyệt: ${TRADE_POST_CATEGORY_INVALID_MESSAGE}`
              : error instanceof TradePostRequestError
              ? `Tin đã được lưu nháp nhưng chưa gửi duyệt: ${error.message}`
              : "Tin đã được lưu nháp nhưng chưa thể gửi duyệt."
          );
        }
      } else {
        setResult(created);
        setSubmitFailed(false);
      }
    } catch (error: unknown) {
      if (isTradePostCategoryInvalidError(error)) {
        setCategory("");
        reloadCategories();
        setSubmitError(TRADE_POST_CATEGORY_INVALID_MESSAGE);
        return;
      }
      if (
        error instanceof TradePostRequestError &&
        error.status === 403 &&
        error.code === "BUSINESS_PROFILE_REQUIRED"
      ) {
        setSubmitError("");
        setBusinessDialogSource("submit");
        return;
      }
      setSubmitError(
        error instanceof TradePostRequestError
          ? error.message
          : "Không thể tạo tin giao thương. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const retrySubmit = async () => {
    if (!result || !accessToken) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const submitted = await submitTradePost(accessToken, result.id);
      setResult(submitted);
      setSubmitFailed(false);
    } catch (error: unknown) {
      if (isTradePostExpiredError(error)) {
        navigate(`/trade/manage/posts/${result.id}/edit`, {
          state: {
            flashMessage: "Tin đã quá ngày hết hạn, vui lòng cập nhật.",
          },
        });
        return;
      }
      if (
        error instanceof TradePostRequestError &&
        error.status === 403 &&
        error.code === "BUSINESS_PROFILE_REQUIRED"
      ) {
        setBusinessDialogSource("submit");
        return;
      }
      if (isTradePostCategoryInvalidError(error)) {
        setCategory("");
        reloadCategories();
      }
      setSubmitError(
        isTradePostCategoryInvalidError(error)
          ? TRADE_POST_CATEGORY_INVALID_MESSAGE
          : error instanceof TradePostRequestError
          ? error.message
          : "Chưa thể gửi tin để duyệt."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => (
    <header className="trade-header trade-create-header">
      <div className="trade-header__bar">
        <button
          className="trade-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <p>Kết nối cộng đồng</p>
          <h1>Đăng tin giao thương</h1>
        </div>
      </div>
      <p className="trade-header__description">
        Chia sẻ sản phẩm, dịch vụ và nhu cầu của bạn để kết nối với khách hàng,
        đối tác trong cộng đồng địa phương.
      </p>
    </header>
  );

  const accessDialogs = (
    <>
      <TradeLoginRequiredDialog
        visible={loginDialogOpen}
        loading={isAuthenticating}
        error={loginError}
        onLogin={() => void handleLogin()}
        onClose={() => {
          if (isAuthenticating) return;
          setLoginDialogOpen(false);
          if (!hasBusinessAccess) navigate("/trade", { replace: true });
        }}
      />
      <BusinessProfileRequiredDialog
        visible={businessDialogSource !== null}
        zaloId={user?.zaloId}
        onClose={() => {
          const source = businessDialogSource;
          setBusinessDialogSource(null);
          if (source === "gate") navigate("/trade", { replace: true });
        }}
      />
    </>
  );

  if (
    authStatus === "idle" ||
    authStatus === "loading" ||
    (authStatus === "authenticated" &&
      user?.status === "ACTIVE" &&
      !hasBusinessAccess)
  ) {
    return (
      <Page className="trade-flow-page trade-create-page">
        {renderHeader()}
        <p className="trade-flow__loading">Đang xác thực quyền đăng tin...</p>
        {accessDialogs}
      </Page>
    );
  }

  if (authStatus === "error") {
    return (
      <Page className="trade-flow-page trade-create-page">
        {renderHeader()}
        <main className="trade-flow__content">
          <p className="trade-flow__message--error">{authError}</p>
          <button
            className="trade-flow__primary"
            type="button"
            onClick={() => setLoginDialogOpen(true)}
          >
            Đăng nhập Zalo và thử lại
          </button>
        </main>
        {accessDialogs}
      </Page>
    );
  }

  if (!user || user.status !== "ACTIVE" || !hasBusinessAccess) {
    return (
      <Page className="trade-flow-page trade-create-page">
        {renderHeader()}
        <main className="trade-flow__content">
          <section className="trade-flow__status-card trade-flow__status-card--error">
            <Icon icon="zi-warning" />
            <h2>Tài khoản chưa hoạt động</h2>
            <p>Vui lòng liên hệ quản trị viên để kiểm tra trạng thái tài khoản.</p>
          </section>
        </main>
        {accessDialogs}
      </Page>
    );
  }

  return (
    <Page className="trade-flow-page trade-create-page">
      {renderHeader()}

      <main className="trade-flow__content">
        {result ? (
          <section className={`trade-flow__status-card ${submitFailed ? "trade-flow__status-card--pending" : "trade-flow__status-card--success"}`}>
            <Icon icon={submitFailed ? "zi-clock-1" : "zi-check-circle-solid"} />
            <h2>{result.status === "PENDING" ? "Tin đã được gửi duyệt" : "Tin đã được lưu nháp"}</h2>
            <p>{result.title}</p>
            {submitError && <p className="trade-flow__message--error">{submitError}</p>}
            {submitFailed && (
              <button type="button" disabled={isSubmitting} onClick={() => void retrySubmit()}>
                {isSubmitting ? "Đang gửi..." : "Gửi duyệt lại"}
              </button>
            )}
            <button type="button" onClick={() => navigate("/trade")}>Về trang Giao thương</button>
          </section>
        ) : (
          <>
            <aside className="trade-create__intro">
              <Icon icon="zi-info-circle-solid" />
              <div>
                <strong>Tạo tin giao thương mới</strong>
                <p>
                  Điền đầy đủ thông tin bên dưới. Tin sẽ được quản trị viên kiểm
                  duyệt trước khi hiển thị công khai.
                </p>
              </div>
            </aside>

            <form className="trade-flow__form" onSubmit={handleSubmit}>
            <section className="trade-flow__form-card trade-create__form-card">
              <h2>Nội dung tin</h2>
              <p className="trade-create__section-description">
                Giới thiệu ngắn gọn, rõ ràng về sản phẩm hoặc nhu cầu của bạn.
              </p>
              <label>
                <span className="trade-flow__label-text">
                  Danh mục <i aria-hidden="true">*</i>
                </span>
                <select
                  name="category"
                  value={category}
                  disabled={isLoadingCategories || categories.length === 0}
                  required
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {isLoadingCategories && (
                    <option value="">Đang tải danh mục...</option>
                  )}
                  {!isLoadingCategories && categories.length === 0 && (
                    <option value="">Chưa có danh mục</option>
                  )}
                  {categories.map((item) => (
                    <option value={item.code} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {categoryLoadError && (
                <div className="trade-categories-error" role="alert">
                  <span>{categoryLoadError}</span>
                  <button
                    type="button"
                    onClick={reloadCategories}
                  >
                    Thử lại
                  </button>
                </div>
              )}
              <label>
                <span className="trade-flow__label-text">
                  Tiêu đề <i aria-hidden="true">*</i>
                </span>
                <input name="title" maxLength={200} placeholder="Nhập tiêu đề tin đăng" required />
              </label>
              <label>
                <span className="trade-flow__label-text">
                  Tóm tắt <i aria-hidden="true">*</i>
                </span>
                <textarea name="summary" maxLength={500} rows={3} placeholder="Mô tả ngắn gọn nội dung nổi bật" required />
              </label>
              <label>
                <span className="trade-flow__label-text">
                  Nội dung chi tiết <i aria-hidden="true">*</i>
                </span>
                <textarea name="description" maxLength={5000} rows={7} placeholder="Cung cấp thông tin chi tiết để người xem dễ liên hệ" required />
              </label>
              <label className="trade-flow__file">
                <span className="trade-flow__label-text">
                  Ảnh tin đăng
                  <small>Không bắt buộc · {selectedImages.length}/{MAX_IMAGES} ảnh</small>
                </span>
                <input
                  name="images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={isSubmitting || selectedImages.length >= MAX_IMAGES}
                  onChange={addImages}
                />
                <small>
                  Chọn nhiều ảnh hoặc thêm qua nhiều lần; JPG, PNG hoặc WebP,
                  mỗi ảnh tối đa 5MB. Ảnh hiển thị theo thứ tự đã chọn.
                </small>
              </label>
              {selectedImages.length > 0 && (
                <div
                  className="trade-create__image-previews"
                  aria-label="Ảnh tin đăng đã chọn"
                >
                  {selectedImages.map((image, index) => (
                    <figure className="trade-create__image-preview" key={image.key}>
                      <PreviewableImage
                        src={image.previewUrl}
                        alt={`Ảnh đã chọn ${index + 1}`}
                        previewImages={selectedImages.map(
                          (selectedImage) => selectedImage.previewUrl
                        )}
                        previewIndex={index}
                        previewTitle="Ảnh tin đăng đã chọn"
                      />
                      {index === 0 && <span>Ảnh đầu tiên</span>}
                      <button
                        type="button"
                        disabled={isSubmitting}
                        aria-label={`Xóa ảnh ${index + 1}`}
                        onClick={() => removeImage(image.key)}
                      >
                        ×
                      </button>
                    </figure>
                  ))}
                </div>
              )}
              {imageError && (
                <p className="trade-create__image-error" role="alert">
                  {imageError}
                </p>
              )}
            </section>

            <section className="trade-flow__form-card trade-create__form-card">
              <h2>Giá và địa điểm</h2>
              <p className="trade-create__section-description">
                Cung cấp mức giá và địa chỉ để người xem dễ ra quyết định.
              </p>
              <label>
                <span className="trade-flow__label-text">
                  Hình thức giá <i aria-hidden="true">*</i>
                </span>
                <select name="priceType" value={priceType} onChange={(event) => setPriceType(event.target.value as TradePostPriceType)}>
                  <option value="CONTACT">Liên hệ báo giá</option>
                  <option value="NEGOTIABLE">Thỏa thuận</option>
                  <option value="FIXED">Giá cố định</option>
                </select>
              </label>
              {priceType === "FIXED" && (
                <label>
                  <span className="trade-flow__label-text">
                    Giá (VNĐ) <i aria-hidden="true">*</i>
                  </span>
                  <input name="price" type="number" min="1" step="1000" inputMode="numeric" placeholder="Ví dụ: 500000" required />
                </label>
              )}
              <label>
                <span className="trade-flow__label-text">
                  Nhãn giá <small>Không bắt buộc</small>
                </span>
                <input name="priceLabel" maxLength={100} placeholder="Ví dụ: Liên hệ báo giá" />
              </label>
              <label>
                <span className="trade-flow__label-text">
                  Địa chỉ <i aria-hidden="true">*</i>
                </span>
                <textarea name="address" maxLength={300} rows={3} placeholder="Nhập địa chỉ giao dịch hoặc cung cấp dịch vụ" required />
              </label>
              <label>
                <span className="trade-flow__label-text">
                  Ngày hết hạn <small>Không bắt buộc</small>
                </span>
                <input name="expiresAt" type="date" min={minExpiryDate} />
                {expiresAtError && (
                  <span className="trade-flow__field-error" role="alert">
                    {expiresAtError}
                  </span>
                )}
              </label>
            </section>

            {requiresPromotionDetails && (
              <section className="trade-flow__form-card trade-create__form-card">
                <h2>Thông tin khuyến mãi</h2>
                <p className="trade-create__section-description">
                  Thiết lập mức ưu đãi và thời gian áp dụng chương trình.
                </p>
                <label>
                  <span className="trade-flow__label-text">
                    Phần trăm khuyến mãi <i aria-hidden="true">*</i>
                  </span>
                  <input
                    name="promotionPercent"
                    type="number"
                    min="1"
                    max="100"
                    inputMode="numeric"
                    value={promotionPercentValue}
                    required
                    onChange={(event) =>
                      setPromotionPercentValue(event.target.value)
                    }
                  />
                </label>
                <label>
                  <span className="trade-flow__label-text">
                    Bắt đầu <i aria-hidden="true">*</i>
                  </span>
                  <input
                    name="promotionStartAt"
                    type="datetime-local"
                    value={promotionStartAtValue}
                    required
                    onChange={(event) =>
                      setPromotionStartAtValue(event.target.value)
                    }
                  />
                </label>
                <label>
                  <span className="trade-flow__label-text">
                    Kết thúc <i aria-hidden="true">*</i>
                  </span>
                  <input
                    name="promotionEndAt"
                    type="datetime-local"
                    value={promotionEndAtValue}
                    required
                    onChange={(event) =>
                      setPromotionEndAtValue(event.target.value)
                    }
                  />
                </label>
              </section>
            )}

            <section className="trade-flow__form-card trade-create__form-card">
              <h2>Thông tin liên hệ</h2>
              <p className="trade-create__section-description">
                Thông tin để khách hàng hoặc đối tác trao đổi trực tiếp với bạn.
              </p>
              <label>
                <span className="trade-flow__label-text">
                  Người liên hệ <i aria-hidden="true">*</i>
                </span>
                <input name="contactName" defaultValue={user.displayName} maxLength={120} autoComplete="name" placeholder="Nhập tên người liên hệ" required />
              </label>
              <label>
                <span className="trade-flow__label-text">
                  Số điện thoại <i aria-hidden="true">*</i>
                </span>
                <input name="contactPhone" defaultValue={user.phone ?? ""} inputMode="tel" autoComplete="tel" placeholder="0901234567" required />
              </label>
              <label>
                <span className="trade-flow__label-text">
                  Zalo liên hệ <small>Không bắt buộc</small>
                </span>
                <input name="contactZalo" maxLength={120} placeholder="Nhập tên hoặc số Zalo" />
              </label>
            </section>

            {submitError && <p className="trade-flow__message--error" role="alert">{submitError}</p>}
            <div className="trade-flow__actions">
              <button
                type="submit"
                disabled={isSubmitting || isLoadingCategories || !selectedCategory}
                onClick={() => { submitIntent.current = "draft"; }}
              >
                {isSubmitting && submitIntent.current === "draft" ? "Đang lưu..." : "Lưu nháp"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoadingCategories || !selectedCategory}
                onClick={() => { submitIntent.current = "submit"; }}
              >
                <Icon icon="zi-send-solid" />
                {isSubmitting && submitIntent.current === "submit" ? "Đang gửi..." : "Gửi duyệt"}
              </button>
            </div>
            </form>
          </>
        )}
      </main>
      {accessDialogs}
    </Page>
  );
}

export default TradeCreatePage;
