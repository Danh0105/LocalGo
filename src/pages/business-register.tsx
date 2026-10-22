import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon, Page, useLocation, useNavigate } from "zmp-ui";
import { getUserInfo } from "zmp-sdk";

import { useCurrentUser } from "@/contexts/auth-context";
import {
  BusinessApplicantType,
  BusinessApplication,
  BusinessApplicationError,
  BusinessApplicationPayload,
  BusinessApplicationZaloCheck,
  BusinessTypeInfo,
  checkBusinessApplicationByZaloId,
  createBusinessApplication,
  getBusinessTypes,
  getMyBusinessApplication,
  resubmitBusinessApplication,
} from "@/services/business-applications";
import { uploadContentImages } from "@/services/media";
import "../css/pages/trade.css";

interface ZaloProfile {
  zaloId: string;
  name: string;
  avatar: string;
}

type RegisterStep = "type" | "applicant" | "form";

const APPLICANT_TYPE_LABELS: Record<BusinessApplicantType, string> = {
  INDIVIDUAL: "Cá nhân",
  ORGANIZATION: "Tổ chức",
};

const FIELD_INPUT_HINTS: Record<
  string,
  { type?: "text" | "date" | "number"; maxLength?: number; placeholder?: string }
> = {
  identityNumber: { maxLength: 50 },
  identityIssuedAt: { type: "date" },
  identityIssuedPlace: { maxLength: 200 },
  legalName: { maxLength: 250 },
  taxCode: { maxLength: 50 },
  representativeName: { maxLength: 120 },
  representativeTitle: { maxLength: 120 },
  templeName: { maxLength: 200 },
  openingHours: { maxLength: 100, placeholder: "Ví dụ: 6:00 – 22:00" },
  seatingCapacity: { type: "number" },
  roomCount: { type: "number" },
  gardenArea: { maxLength: 100, placeholder: "Ví dụ: 2 ha" },
  mainProducts: { maxLength: 300 },
};

const PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string): string | null {
  return text(formData, name) || null;
}

function applicationDate(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function dynamicValuesFromApplication(
  application: BusinessApplication | null
): Record<string, string> {
  if (!application) return {};
  const source: Record<string, string | number | null> = {
    identityNumber: application.identityNumber,
    identityIssuedAt: applicationDate(application.identityIssuedAt) || null,
    identityIssuedPlace: application.identityIssuedPlace,
    legalName: application.legalName,
    taxCode: application.taxCode,
    representativeName: application.representativeName,
    representativeTitle: application.representativeTitle,
    templeName: application.templeName,
    openingHours: application.openingHours,
    seatingCapacity: application.seatingCapacity,
    roomCount: application.roomCount,
    gardenArea: application.gardenArea,
    mainProducts: application.mainProducts,
  };
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && value !== undefined && value !== "") {
      result[key] = String(value);
    }
  }
  return result;
}

function BusinessRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notificationReason =
    (location.state as { reason?: string } | null)?.reason?.trim() ?? "";
  const {
    user,
    accessToken,
    status: authStatus,
    error: authError,
    authenticate,
  } = useCurrentUser();
  const [application, setApplication] = useState<BusinessApplication | null>(null);
  const [zaloCheck, setZaloCheck] = useState<BusinessApplicationZaloCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasApplicationLoadError, setHasApplicationLoadError] = useState(false);
  const [hasApprovedSyncError, setHasApprovedSyncError] = useState(false);
  const [applicationReloadKey, setApplicationReloadKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [zaloProfile, setZaloProfile] = useState<ZaloProfile | null>(null);
  const [zaloProfileError, setZaloProfileError] = useState("");
  const [zaloProfileReloadKey, setZaloProfileReloadKey] = useState(0);

  const [businessTypes, setBusinessTypes] = useState<BusinessTypeInfo[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState("");
  const [typesReloadKey, setTypesReloadKey] = useState(0);

  const [step, setStep] = useState<RegisterStep>("type");
  const [selectedType, setSelectedType] = useState<BusinessTypeInfo | null>(null);
  const [applicantType, setApplicantType] =
    useState<BusinessApplicantType>("INDIVIDUAL");
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({});
  const hasInitializedStepRef = useRef(false);

  const applicantSpec = useMemo(
    () =>
      selectedType?.applicantTypes.find(
        (item) => item.applicantType === applicantType
      ) ?? null,
    [selectedType, applicantType]
  );

  useEffect(() => {
    let active = true;
    setIsLoadingTypes(true);
    setTypesError("");
    void getBusinessTypes()
      .then((items) => {
        if (!active) return;
        setBusinessTypes(items);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTypesError(
          error instanceof BusinessApplicationError
            ? error.message
            : "Không thể tải danh sách loại hình đăng ký."
        );
      })
      .finally(() => {
        if (active) setIsLoadingTypes(false);
      });
    return () => {
      active = false;
    };
  }, [typesReloadKey]);

  useEffect(() => {
    if (authStatus === "idle") {
      void authenticate({ requestUserInfoPermission: true }).catch(() => undefined);
    }
  }, [authStatus, authenticate]);

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
    if (!zaloProfile) return;

    let active = true;
    setIsLoading(true);
    setHasApprovedSyncError(false);
    void (async () => {
      try {
        const [result, check] = await Promise.all([
          getMyBusinessApplication(accessToken),
          checkBusinessApplicationByZaloId(zaloProfile.zaloId),
        ]);
        if (!active) return;
        setApplication(result);
        setZaloCheck(check);
        setHasApplicationLoadError(false);
        setHasApprovedSyncError(false);
        setPageError("");
        const isApproved =
          result?.status === "APPROVED" ||
          (check.exists && check.status === "APPROVED");
        if (user.status === "ACTIVE" && isApproved) {
          if (user.role === "BUSINESS") {
            navigate("/trade/create", { replace: true });
          } else {
            setHasApprovedSyncError(true);
          }
        }
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

  const retryApplicationLoad = () => {
    hasInitializedStepRef.current = false;
    setApplicationReloadKey((value) => value + 1);
  };

  // Once both the application (or its absence) and the business-type catalog
  // are known, decide the starting step a single time: resume straight into
  // the form for an existing application, otherwise start at type selection.
  useEffect(() => {
    if (hasInitializedStepRef.current) return;
    if (isLoading || isLoadingTypes || businessTypes.length === 0) return;

    if (application) {
      const matchedType =
        businessTypes.find((item) => item.type === application.businessType) ??
        businessTypes.find((item) => item.type === "GENERAL") ??
        businessTypes[0];
      setSelectedType(matchedType);
      setApplicantType(application.applicantType);
      setDynamicValues(dynamicValuesFromApplication(application));
      setStep("form");
    } else {
      setStep("type");
    }
    hasInitializedStepRef.current = true;
  }, [application, isLoading, isLoadingTypes, businessTypes]);

  const selectType = (type: BusinessTypeInfo) => {
    setSelectedType(type);
    setDynamicValues((current) =>
      application && application.businessType === type.type ? current : {}
    );
    setDocumentFiles({});
    setPageError("");
    if (type.applicantTypes.length === 1) {
      setApplicantType(type.applicantTypes[0].applicantType);
      setStep("form");
    } else {
      setStep("applicant");
    }
  };

  const selectApplicantType = (value: BusinessApplicantType) => {
    setApplicantType(value);
    setStep("form");
  };

  const setDynamicValue = (field: string, value: string) => {
    setDynamicValues((current) => ({ ...current, [field]: value }));
  };

  const setDocumentFile = (type: string, file: File | null) => {
    setDocumentFiles((current) => ({ ...current, [type]: file }));
  };

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
    if (!selectedType || !applicantSpec) {
      setPageError("Vui lòng chọn loại hình đăng ký.");
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
      setPageError("Tên cơ sở cần từ 2-200 ký tự.");
      return;
    }
    if (businessCategory && businessCategory.length > 120) {
      setPageError("Lĩnh vực kinh doanh không được vượt quá 120 ký tự.");
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

    const missingFieldLabels = applicantSpec.requiredFields
      .filter((field) => !dynamicValues[field.field]?.trim())
      .map((field) => field.label);
    if (missingFieldLabels.length > 0) {
      setPageError(`Vui lòng nhập: ${missingFieldLabels.join(", ")}.`);
      return;
    }

    for (const field of ["seatingCapacity", "roomCount"]) {
      const value = dynamicValues[field];
      if (value && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
        setPageError("Số lượng nhập vào phải là một số lớn hơn 0.");
        return;
      }
    }

    const missingDocumentLabels = applicantSpec.requiredDocuments.filter(
      (doc) => !documentFiles[doc.type]
    );
    if (missingDocumentLabels.length > 0) {
      setPageError(
        `Vui lòng chọn: ${missingDocumentLabels.map((doc) => doc.label).join(", ")}.`
      );
      return;
    }

    const documentsToUpload = [
      ...applicantSpec.requiredDocuments,
      ...applicantSpec.optionalDocuments,
    ]
      .map((doc) => ({ doc, file: documentFiles[doc.type] }))
      .filter(
        (entry): entry is { doc: (typeof applicantSpec.requiredDocuments)[number]; file: File } =>
          entry.file instanceof File
      );

    const invalidFile = documentsToUpload.find(
      ({ file }) =>
        !ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE
    );
    if (invalidFile) {
      setPageError(
        !ALLOWED_IMAGE_TYPES.has(invalidFile.file.type)
          ? `${invalidFile.doc.label} chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.`
          : `${invalidFile.doc.label} không được vượt quá 5MB.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const uploadedMedia = documentsToUpload.length
        ? await uploadContentImages(
            accessToken,
            documentsToUpload.map(({ file }) => file)
          )
        : [];
      const uploaded = documentsToUpload.map(({ doc, file }, index) => ({
        media: uploadedMedia[index],
        file,
        type: doc.type,
      }));

      const seatingCapacity = dynamicValues.seatingCapacity
        ? Number(dynamicValues.seatingCapacity)
        : null;
      const roomCount = dynamicValues.roomCount
        ? Number(dynamicValues.roomCount)
        : null;

      const payload: BusinessApplicationPayload = {
        applicantType,
        businessType: selectedType.type,
        businessName,
        ...(businessCategory ? { businessCategory } : {}),
        contactName,
        contactPhone,
        contactEmail,
        address,
        identityNumber: dynamicValues.identityNumber || null,
        identityIssuedAt: dynamicValues.identityIssuedAt || null,
        identityIssuedPlace: dynamicValues.identityIssuedPlace || null,
        legalName: dynamicValues.legalName || null,
        taxCode: dynamicValues.taxCode || null,
        representativeName: dynamicValues.representativeName || null,
        representativeTitle: dynamicValues.representativeTitle || null,
        templeName: dynamicValues.templeName || null,
        openingHours: dynamicValues.openingHours || null,
        seatingCapacity,
        roomCount,
        gardenArea: dynamicValues.gardenArea || null,
        mainProducts: dynamicValues.mainProducts || null,
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
      setDocumentFiles({});
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

  const renderTypeStep = () => {
    if (isLoadingTypes) {
      return <p className="trade-flow__loading">Đang tải danh sách loại hình...</p>;
    }
    if (typesError) {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Chưa thể tải danh sách loại hình</h2>
          <p>{typesError}</p>
          <button
            type="button"
            onClick={() => setTypesReloadKey((value) => value + 1)}
          >
            Thử lại
          </button>
        </section>
      );
    }

    return (
      <section className="business-type-step">
        <h2>Bạn muốn đăng ký với tư cách nào?</h2>
        <p className="trade-create__section-description">
          Chọn loại hình phù hợp để hệ thống hiển thị đúng thông tin và giấy tờ cần nộp.
        </p>
        <div className="business-type-grid">
          {businessTypes.map((type) => (
            <button
              key={type.type}
              type="button"
              className="business-type-card"
              onClick={() => selectType(type)}
            >
              <strong>{type.label}</strong>
              <span>{type.description}</span>
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderApplicantStep = () => {
    if (!selectedType) return null;
    return (
      <section className="business-type-step">
        <button
          className="business-type-step__back"
          type="button"
          onClick={() => setStep("type")}
        >
          <Icon icon="zi-arrow-left" /> Đổi loại hình
        </button>
        <h2>Bạn đăng ký với tư cách nào?</h2>
        <p className="trade-create__section-description">
          Loại hình: <strong>{selectedType.label}</strong>
        </p>
        <div className="business-type-grid business-type-grid--applicant">
          {selectedType.applicantTypes.map((spec) => (
            <button
              key={spec.applicantType}
              type="button"
              className="business-type-card"
              onClick={() => selectApplicantType(spec.applicantType)}
            >
              <strong>{APPLICANT_TYPE_LABELS[spec.applicantType]}</strong>
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderDynamicField = (
    field: { field: string; label: string },
    required: boolean
  ) => {
    const hint = FIELD_INPUT_HINTS[field.field] ?? {};
    return (
      <label key={field.field}>
        <span className="trade-flow__label-text">
          {field.label} {required && <i aria-hidden="true">*</i>}
        </span>
        <input
          type={hint.type === "date" ? "date" : hint.type === "number" ? "number" : "text"}
          min={hint.type === "number" ? 1 : undefined}
          maxLength={hint.maxLength}
          placeholder={hint.placeholder}
          value={dynamicValues[field.field] ?? ""}
          required={required}
          onChange={(event) => setDynamicValue(field.field, event.target.value)}
        />
      </label>
    );
  };

  const renderFormStep = () => {
    if (!selectedType || !applicantSpec) return null;
    const isTemple = selectedType.type === "TEMPLE_MANAGEMENT";

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

        <section className="business-type-summary">
          <div>
            <span>Loại hình đã chọn</span>
            <strong>{selectedType.label}</strong>
            {selectedType.applicantTypes.length > 1 && (
              <span className="business-type-summary__applicant">
                {APPLICANT_TYPE_LABELS[applicantType]}
              </span>
            )}
          </div>
          <button type="button" onClick={() => setStep("type")}>
            Đổi loại hình
          </button>
          {selectedType.applicantTypes.length > 1 && (
            <button type="button" onClick={() => setStep("applicant")}>
              Đổi tư cách
            </button>
          )}
        </section>

        <section className="trade-flow__form-card">
          <h2>Thông tin đăng ký</h2>
          <label>
            {isTemple ? "Tên Ban quản lý" : "Tên hộ kinh doanh / doanh nghiệp"}
            <input
              name="businessName"
              defaultValue={application?.businessName ?? ""}
              maxLength={200}
              placeholder={isTemple ? "Ví dụ: Ban quản lý Đền Bà" : undefined}
              required
            />
          </label>
          <label>
            Lĩnh vực kinh doanh <span>(không bắt buộc)</span>
            <input
              name="businessCategory"
              defaultValue={application?.businessCategory ?? ""}
              maxLength={120}
              placeholder="Ví dụ: Nông sản, du lịch, vận tải..."
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
              defaultValue={application?.contactName ?? user?.displayName ?? ""}
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
              defaultValue={application?.contactPhone ?? user?.phone ?? ""}
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
              defaultValue={application?.contactEmail ?? user?.email ?? ""}
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

        {(applicantSpec.requiredFields.length > 0 ||
          applicantSpec.optionalFields.length > 0) && (
          <section className="trade-flow__form-card">
            <h2>Giấy tờ &amp; thông tin bổ sung</h2>
            {applicantSpec.requiredFields.map((field) =>
              renderDynamicField(field, true)
            )}
            {applicantSpec.optionalFields.map((field) =>
              renderDynamicField(field, false)
            )}
          </section>
        )}

        {(applicantSpec.requiredDocuments.length > 0 ||
          applicantSpec.optionalDocuments.length > 0) && (
          <section className="trade-flow__form-card">
            <h2>Ảnh giấy tờ</h2>
            {applicantSpec.requiredDocuments.map((doc) => (
              <label className="trade-flow__file" key={doc.type}>
                {doc.label}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setDocumentFile(doc.type, event.target.files?.[0] ?? null)
                  }
                  required={!documentFiles[doc.type]}
                />
                <small>JPG, PNG hoặc WebP; tối đa 5MB.</small>
              </label>
            ))}
            {applicantSpec.optionalDocuments.map((doc) => (
              <label className="trade-flow__file" key={doc.type}>
                {doc.label} <span>(không bắt buộc)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setDocumentFile(doc.type, event.target.files?.[0] ?? null)
                  }
                />
                <small>JPG, PNG hoặc WebP; tối đa 5MB.</small>
              </label>
            ))}
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

    if (
      authStatus === "idle" ||
      authStatus === "loading" ||
      !zaloProfile ||
      isLoading ||
      isLoadingTypes
    ) {
      return <p className="trade-flow__loading">Đang xác thực tài khoản...</p>;
    }

    if (authStatus === "error" || !user) {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Chưa thể đăng nhập</h2>
          <p>{authError || "Không thể xác thực tài khoản Zalo."}</p>
          <button
            type="button"
            onClick={() =>
              void authenticate({ requestUserInfoPermission: true }).catch(
                () => undefined
              )
            }
          >
            Cấp quyền Zalo và thử lại
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
            onClick={retryApplicationLoad}
          >
            Thử tải lại
          </button>
        </section>
      );
    }

    if (hasApprovedSyncError) {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Quyền BUSINESS chưa được cập nhật</h2>
          <p>
            Hồ sơ của bạn đã được duyệt nhưng tài khoản vẫn chưa có quyền đăng
            tin. Đây là lỗi hệ thống; vui lòng liên hệ quản trị viên để được
            kiểm tra.
          </p>
          <button
            type="button"
            onClick={() => navigate("/contacts/ubnd-xa-truong-mit")}
          >
            Xem thông tin liên hệ
          </button>
        </section>
      );
    }

    if (application?.status === "PENDING") {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--pending">
          <Icon icon="zi-clock-1" />
          <h2>Hồ sơ của bạn đang chờ duyệt</h2>
          <p>
            Hồ sơ <strong>{application.businessName}</strong> đã được gửi tới Admin.
            Bạn có thể đăng tin ngay sau khi hồ sơ được duyệt.
          </p>
        </section>
      );
    }

    if (application?.status === "APPROVED") {
      return <p className="trade-flow__loading">Đang kiểm tra quyền đăng tin...</p>;
    }

    if (!application && zaloCheck?.exists && zaloCheck.status === "PENDING") {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--pending">
          <Icon icon="zi-clock-1" />
          <h2>Hồ sơ của bạn đang chờ duyệt</h2>
          <p>
            Zalo ID này đã có hồ sơ Business gửi tới Admin và đang chờ xét duyệt.
          </p>
        </section>
      );
    }

    if (!application && zaloCheck?.exists && zaloCheck.status === "APPROVED") {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Quyền BUSINESS chưa được cập nhật</h2>
          <p>
            Hồ sơ đã được duyệt nhưng hệ thống chưa đồng bộ quyền đăng tin cho
            tài khoản của bạn. Vui lòng liên hệ quản trị viên để được kiểm tra.
          </p>
        </section>
      );
    }

    if (!application && zaloCheck?.exists && zaloCheck.status === "REJECTED") {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Chưa tải được hồ sơ cần bổ sung</h2>
          <p>
            Hệ thống đã ghi nhận hồ sơ bị từ chối nhưng chưa trả về nội dung để
            chỉnh sửa. Vui lòng thử tải lại để tránh tạo hồ sơ trùng.
          </p>
          <button
            type="button"
            onClick={retryApplicationLoad}
          >
            Thử tải lại
          </button>
        </section>
      );
    }

    if (!application && zaloCheck?.exists) {
      return (
        <section className="trade-flow__status-card trade-flow__status-card--error">
          <Icon icon="zi-warning" />
          <h2>Chưa xác định được trạng thái hồ sơ</h2>
          <p>
            Zalo ID này đã có hồ sơ BUSINESS. Vui lòng thử tải lại để kiểm tra
            trạng thái và tránh gửi hồ sơ trùng.
          </p>
          <button
            type="button"
            onClick={retryApplicationLoad}
          >
            Thử tải lại
          </button>
        </section>
      );
    }

    if (step === "type") return renderTypeStep();
    if (step === "applicant") return renderApplicantStep();
    return renderFormStep();
  };

  return (
    <Page className="trade-flow-page business-register-page">
      <header className="trade-header trade-create-header business-register-header">
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
            <p>Quyền đăng tin</p>
            <h1>Đăng ký Business</h1>
          </div>
        </div>
        <p className="trade-header__description">
          Hoàn tất hồ sơ để được xác minh và bắt đầu đăng tin giao thương trên
          LocalGo.
        </p>
      </header>
      <main className="trade-flow__content">
        {notificationReason && (
          <p className="trade-flow__message--error">
            Hồ sơ Business cần được điều chỉnh: {notificationReason}
          </p>
        )}
        {pageError && step !== "form" && (
          <p className="trade-flow__message--error">{pageError}</p>
        )}
        {renderBody()}
      </main>
    </Page>
  );
}

export default BusinessRegisterPage;
