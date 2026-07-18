import { FormEvent, useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";
import { getUserInfo } from "zmp-sdk";

import { useCurrentUser } from "@/contexts/auth-context";
import {
  BusinessApplicantType,
  BusinessApplication,
  BusinessApplicationError,
  BusinessApplicationPayload,
  BusinessApplicationZaloCheck,
  checkBusinessApplicationByZaloId,
  createBusinessApplication,
  getMyBusinessApplication,
  resubmitBusinessApplication,
  uploadBusinessDocument,
} from "@/services/business-applications";
import "../css/pages/trade.css";

interface ZaloProfile {
  zaloId: string;
  name: string;
  avatar: string;
}

const PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string): string | null {
  return text(formData, name) || null;
}

function requiredDocument(formData: FormData, name: string, label: string): File {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`Vui lòng chọn ảnh ${label}.`);
  }
  if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
    throw new Error(`${label} chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.`);
  }
  if (value.size > MAX_IMAGE_SIZE) {
    throw new Error(`${label} không được vượt quá 5MB.`);
  }
  return value;
}

function applicationDate(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function BusinessRegisterPage() {
  const navigate = useNavigate();
  const {
    user,
    accessToken,
    status: authStatus,
    error: authError,
    authenticate,
    refreshUser,
  } = useCurrentUser();
  const [application, setApplication] = useState<BusinessApplication | null>(null);
  const [zaloCheck, setZaloCheck] = useState<BusinessApplicationZaloCheck | null>(null);
  const [applicantType, setApplicantType] =
    useState<BusinessApplicantType>("INDIVIDUAL");
  const [isLoading, setIsLoading] = useState(true);
  const [hasApplicationLoadError, setHasApplicationLoadError] = useState(false);
  const [applicationReloadKey, setApplicationReloadKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [zaloProfile, setZaloProfile] = useState<ZaloProfile | null>(null);
  const [zaloProfileError, setZaloProfileError] = useState("");
  const [zaloProfileReloadKey, setZaloProfileReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setZaloProfileError("");
    void (async () => {
      try {
        const { userInfo } = await getUserInfo({ autoRequestPermission: true });
        if (!active) return;
        setZaloProfile({
          zaloId: userInfo.id,
          name: userInfo.name,
          avatar: userInfo.avatar,
        });
      } catch {
        if (!active) return;
        setZaloProfileError(
          "Cần quyền truy cập Zalo ID và thông tin Zalo để nộp hồ sơ đăng ký Business."
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [zaloProfileReloadKey]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !accessToken || !user) return;
    if (user.role === "BUSINESS" && user.status === "ACTIVE") {
      setIsLoading(false);
      navigate("/trade/create", { replace: true });
      return;
    }
    if (!zaloProfile) return;

    let active = true;
    setIsLoading(true);
    void (async () => {
      try {
        const [result, check] = await Promise.all([
          getMyBusinessApplication(accessToken),
          checkBusinessApplicationByZaloId(zaloProfile.zaloId),
        ]);
        if (!active) return;
        setApplication(result);
        setZaloCheck(check);
        if (result) setApplicantType(result.applicantType);
        setHasApplicationLoadError(false);
        setPageError("");
      } catch (error: unknown) {
        if (!active) return;
        setPageError(
          error instanceof BusinessApplicationError
            ? error.message
            : "Không thể tải hồ sơ Business."
        );
        setHasApplicationLoadError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [authStatus, accessToken, user, applicationReloadKey, navigate, zaloProfile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      setPageError("Phiên đăng nhập chưa sẵn sàng. Vui lòng thử lại.");
      return;
    }
    if (!zaloProfile) {
      setPageError("Vui lòng cấp quyền truy cập Zalo ID để nộp hồ sơ.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setPageError("");

    const businessName = text(formData, "businessName");
    const businessCategory = text(formData, "businessCategory");
    const contactName = text(formData, "contactName");
    const contactPhone = text(formData, "contactPhone");
    const contactEmail = text(formData, "contactEmail");
    const address = text(formData, "address");

    if (businessName.length < 2 || businessName.length > 200) {
      setPageError("Tên hộ kinh doanh/doanh nghiệp cần từ 2-200 ký tự.");
      return;
    }
    if (businessCategory.length < 2 || businessCategory.length > 120) {
      setPageError("Lĩnh vực kinh doanh cần từ 2-120 ký tự.");
      return;
    }
    if (contactName.length < 2 || contactName.length > 120) {
      setPageError("Tên người liên hệ cần từ 2-120 ký tự.");
      return;
    }
    if (!PHONE_PATTERN.test(contactPhone)) {
      setPageError("Số điện thoại Việt Nam không hợp lệ.");
      return;
    }
    if (!contactEmail || contactEmail.length > 254) {
      setPageError("Email liên hệ không hợp lệ.");
      return;
    }
    if (address.length < 2 || address.length > 500) {
      setPageError("Địa chỉ cần từ 2-500 ký tự.");
      return;
    }

    try {
      const files =
        applicantType === "INDIVIDUAL"
          ? [
              {
                file: requiredDocument(formData, "identityFront", "CCCD mặt trước"),
                type: "IDENTITY_FRONT" as const,
              },
              {
                file: requiredDocument(formData, "identityBack", "CCCD mặt sau"),
                type: "IDENTITY_BACK" as const,
              },
            ]
          : [
              {
                file: requiredDocument(
                  formData,
                  "businessLicense",
                  "giấy phép kinh doanh"
                ),
                type: "BUSINESS_LICENSE" as const,
              },
            ];

      if (
        applicantType === "INDIVIDUAL" &&
        (!text(formData, "identityNumber") ||
          !text(formData, "identityIssuedAt") ||
          !text(formData, "identityIssuedPlace"))
      ) {
        throw new Error("Vui lòng nhập đầy đủ thông tin CCCD.");
      }
      if (
        applicantType === "ORGANIZATION" &&
        (!text(formData, "legalName") ||
          !text(formData, "taxCode") ||
          !text(formData, "representativeName") ||
          !text(formData, "representativeTitle"))
      ) {
        throw new Error("Vui lòng nhập đầy đủ pháp nhân và người đại diện.");
      }

      setIsSubmitting(true);
      const uploaded = await Promise.all(
        files.map(async ({ file, type }) => ({
          media: await uploadBusinessDocument(accessToken, file),
          file,
          type,
        }))
      );

      const payload: BusinessApplicationPayload = {
        applicantType,
        businessName,
        businessCategory,
        contactName,
        contactPhone,
        contactEmail,
        address,
        identityNumber:
          applicantType === "INDIVIDUAL"
            ? optionalText(formData, "identityNumber")
            : null,
        identityIssuedAt:
          applicantType === "INDIVIDUAL"
            ? optionalText(formData, "identityIssuedAt")
            : null,
        identityIssuedPlace:
          applicantType === "INDIVIDUAL"
            ? optionalText(formData, "identityIssuedPlace")
            : null,
        legalName:
          applicantType === "ORGANIZATION"
            ? optionalText(formData, "legalName")
            : null,
        taxCode:
          applicantType === "ORGANIZATION"
            ? optionalText(formData, "taxCode")
            : null,
        representativeName:
          applicantType === "ORGANIZATION"
            ? optionalText(formData, "representativeName")
            : null,
        representativeTitle:
          applicantType === "ORGANIZATION"
            ? optionalText(formData, "representativeTitle")
            : null,
        website: optionalText(formData, "website"),
        description: optionalText(formData, "description"),
        zaloId: zaloProfile.zaloId,
        zaloDisplayName: zaloProfile.name,
        zaloAvatarUrl: zaloProfile.avatar,
        documents: uploaded.map(({ media, file, type }) => ({
          mediaId: media.id,
          type,
          name: file.name,
        })),
      };

      const result =
        application?.status === "REJECTED"
          ? await resubmitBusinessApplication(accessToken, application.id, payload)
          : await createBusinessApplication(accessToken, payload);
      setApplication(result);
    } catch (error: unknown) {
      if (error instanceof BusinessApplicationError) {
        setPageError(error.message);
      } else if (error instanceof Error) {
        setPageError(error.message);
      } else {
        setPageError("Không thể nộp hồ sơ Business. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBody = () => {
    if (zaloProfileError) {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Cần quyền truy cập Zalo</h2>
          <p>{zaloProfileError}</p>
          <button
            type="button"
            onClick={() => setZaloProfileReloadKey((value) => value + 1)}
          >
            Thử lại
          </button>
        </section>
      );
    }

    if (authStatus === "loading" || !zaloProfile || isLoading) {
      return <p className="trade-flow__loading">Đang xác thực tài khoản...</p>;
    }

    if (authStatus === "error" || !user) {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Chưa thể đăng nhập</h2>
          <p>{authError || "Không thể xác thực tài khoản Zalo."}</p>
          <button type="button" onClick={() => void authenticate().catch(() => undefined)}>
            Thử lại
          </button>
        </section>
      );
    }

    if (user.status !== "ACTIVE") {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Tài khoản chưa hoạt động</h2>
          <p>Vui lòng liên hệ quản trị viên để kiểm tra trạng thái tài khoản.</p>
        </section>
      );
    }

    if (hasApplicationLoadError) {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Chưa thể kiểm tra hồ sơ</h2>
          <p>{pageError}</p>
          <button
            type="button"
            onClick={() => setApplicationReloadKey((value) => value + 1)}
          >
            Thử tải lại
          </button>
        </section>
      );
    }

    if (user.role === "BUSINESS") {
      return <p className="trade-flow__loading">Đang mở form đăng tin...</p>;
    }

    if (application?.status === "PENDING") {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--pending">
          <Icon icon="zi-clock-1" />
          <h2>Hồ sơ đang chờ duyệt</h2>
          <p>
            Hồ sơ <strong>{application.businessName}</strong> đã được gửi tới Admin.
            Bạn chỉ có thể đăng tin sau khi tài khoản được cấp role Business.
          </p>
        </section>
      );
    }

    if (application?.status === "APPROVED") {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--pending">
          <Icon icon="zi-check-circle" />
          <h2>Hồ sơ đã được duyệt</h2>
          <p>
            Tài khoản hiện vẫn chưa nhận role Business. Hãy làm mới thông tin tài khoản;
            nếu trạng thái không đổi, vui lòng liên hệ Admin.
          </p>
          <button type="button" onClick={() => void refreshUser().catch(() => undefined)}>
            Làm mới tài khoản
          </button>
        </section>
      );
    }

    if (!application && zaloCheck?.exists && zaloCheck.status === "PENDING") {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--pending">
          <Icon icon="zi-clock-1" />
          <h2>Hồ sơ đang chờ duyệt</h2>
          <p>
            Zalo ID này đã có hồ sơ Business gửi tới Admin và đang chờ xét duyệt.
          </p>
        </section>
      );
    }

    if (!application && zaloCheck?.exists && zaloCheck.status === "APPROVED") {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--pending">
          <Icon icon="zi-check-circle" />
          <h2>Hồ sơ đã được duyệt</h2>
          <p>
            Zalo ID này đã có hồ sơ Business được duyệt. Hãy làm mới thông tin tài khoản;
            nếu trạng thái không đổi, vui lòng liên hệ Admin.
          </p>
          <button type="button" onClick={() => void refreshUser().catch(() => undefined)}>
            Làm mới tài khoản
          </button>
        </section>
      );
    }

    return (
      <form
        className="trade-flow__form"
        key={application?.id ?? "new-business-application"}
        onSubmit={handleSubmit}
      >
        {application?.status === "REJECTED" && (
          <div className="trade-flow__notice trade-flow__notice--error">
            <strong>Hồ sơ cần bổ sung</strong>
            <p>{application.rejectionReason || "Admin đã từ chối hồ sơ này."}</p>
            <small>Vui lòng chọn lại ảnh giấy tờ trước khi gửi lại.</small>
          </div>
        )}

        <section className="trade-flow__form-card">
          <h2>Thông tin đăng ký</h2>
          <label>
            Loại hồ sơ
            <select
              name="applicantType"
              value={applicantType}
              onChange={(event) =>
                setApplicantType(event.target.value as BusinessApplicantType)
              }
            >
              <option value="INDIVIDUAL">Cá nhân / Hộ kinh doanh</option>
              <option value="ORGANIZATION">Doanh nghiệp / Tổ chức</option>
            </select>
          </label>
          <label>
            Tên hộ kinh doanh / doanh nghiệp
            <input
              name="businessName"
              defaultValue={application?.businessName ?? ""}
              maxLength={200}
              required
            />
          </label>
          <label>
            Lĩnh vực kinh doanh
            <input
              name="businessCategory"
              defaultValue={application?.businessCategory ?? ""}
              maxLength={120}
              placeholder="Ví dụ: Nông sản, du lịch, vận tải..."
              required
            />
          </label>
          <label>
            Địa chỉ
            <textarea
              name="address"
              defaultValue={application?.address ?? ""}
              maxLength={500}
              rows={3}
              required
            />
          </label>
        </section>

        <section className="trade-flow__form-card">
          <h2>Thông tin liên hệ</h2>
          <label>
            Người liên hệ
            <input
              name="contactName"
              defaultValue={application?.contactName ?? user.displayName}
              maxLength={120}
              required
            />
          </label>
          <label>
            Số điện thoại
            <input
              name="contactPhone"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={application?.contactPhone ?? user.phone ?? ""}
              placeholder="0901234567"
              required
            />
          </label>
          <label>
            Email
            <input
              name="contactEmail"
              type="email"
              autoComplete="email"
              defaultValue={application?.contactEmail ?? user.email ?? ""}
              maxLength={254}
              required
            />
          </label>
          <label>
            Website <span>(không bắt buộc)</span>
            <input
              name="website"
              type="url"
              defaultValue={application?.website ?? ""}
              maxLength={500}
              placeholder="https://..."
            />
          </label>
          <label>
            Giới thiệu <span>(không bắt buộc)</span>
            <textarea
              name="description"
              defaultValue={application?.description ?? ""}
              maxLength={2000}
              rows={4}
            />
          </label>
        </section>

        {applicantType === "INDIVIDUAL" ? (
          <section className="trade-flow__form-card">
            <h2>Thông tin CCCD</h2>
            <label>
              Số CCCD
              <input
                name="identityNumber"
                defaultValue={application?.identityNumber ?? ""}
                maxLength={50}
                required
              />
            </label>
            <label>
              Ngày cấp
              <input
                name="identityIssuedAt"
                type="date"
                defaultValue={applicationDate(application?.identityIssuedAt ?? null)}
                required
              />
            </label>
            <label>
              Nơi cấp
              <input
                name="identityIssuedPlace"
                defaultValue={application?.identityIssuedPlace ?? ""}
                maxLength={200}
                required
              />
            </label>
            <label className="trade-flow__file">
              Ảnh CCCD mặt trước
              <input name="identityFront" type="file" accept="image/jpeg,image/png,image/webp" required />
              <small>JPG, PNG hoặc WebP; tối đa 5MB.</small>
            </label>
            <label className="trade-flow__file">
              Ảnh CCCD mặt sau
              <input name="identityBack" type="file" accept="image/jpeg,image/png,image/webp" required />
              <small>JPG, PNG hoặc WebP; tối đa 5MB.</small>
            </label>
          </section>
        ) : (
          <section className="trade-flow__form-card">
            <h2>Thông tin pháp nhân</h2>
            <label>
              Tên pháp nhân
              <input name="legalName" defaultValue={application?.legalName ?? ""} maxLength={250} required />
            </label>
            <label>
              Mã số thuế
              <input name="taxCode" defaultValue={application?.taxCode ?? ""} maxLength={50} required />
            </label>
            <label>
              Người đại diện
              <input name="representativeName" defaultValue={application?.representativeName ?? ""} maxLength={120} required />
            </label>
            <label>
              Chức vụ
              <input name="representativeTitle" defaultValue={application?.representativeTitle ?? ""} maxLength={120} required />
            </label>
            <label className="trade-flow__file">
              Ảnh giấy phép kinh doanh
              <input name="businessLicense" type="file" accept="image/jpeg,image/png,image/webp" required />
              <small>JPG, PNG hoặc WebP; tối đa 5MB.</small>
            </label>
          </section>
        )}

        {pageError && <p className="trade-flow__message--error">{pageError}</p>}
        <button className="trade-flow__primary" type="submit" disabled={isSubmitting}>
          <Icon icon="zi-send-solid" />
          {isSubmitting
            ? "Đang gửi hồ sơ..."
            : application?.status === "REJECTED"
              ? "Gửi lại hồ sơ"
              : "Nộp hồ sơ Business"}
        </button>
      </form>
    );
  };

  return (
    <Page className="trade-flow-page">
      <header className="trade-flow__header">
        <button type="button" aria-label="Quay lại" onClick={() => navigate(-1)}>
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Quyền đăng tin</span>
          <h1>Đăng ký Business</h1>
        </div>
      </header>
      <main className="trade-flow__content">
        <p className="trade-flow__intro">
          Chỉ hồ sơ được Admin duyệt và tài khoản có role Business mới được đăng tin giao thương.
        </p>
        {pageError && application?.status !== "REJECTED" && (
          <p className="trade-flow__message--error">{pageError}</p>
        )}
        {renderBody()}
      </main>
    </Page>
  );
}

export default BusinessRegisterPage;
