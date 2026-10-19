import { useEffect, useState } from "react";
import { getUserInfo } from "zmp-sdk";
import { Modal, useNavigate } from "zmp-ui";

import {
  BusinessApplicationError,
  checkBusinessApplicationByZaloId,
} from "@/services/business-applications";

interface TradeLoginRequiredDialogProps {
  visible: boolean;
  loading: boolean;
  error?: string;
  onLogin: () => void;
  onClose: () => void;
}

export function TradeLoginRequiredDialog({
  visible,
  loading,
  error,
  onLogin,
  onClose,
}: TradeLoginRequiredDialogProps) {
  return (
    <Modal
      visible={visible}
      title="Đăng nhập để đăng tin"
      description={
        error ||
        "Bạn cần đăng nhập bằng tài khoản Zalo trong Mini App trước khi đăng tin giao thương."
      }
      maskClosable={!loading}
      onClose={onClose}
      actionsDivider
      actions={[
        {
          key: "later",
          text: "Để sau",
          disabled: loading,
          onClick: onClose,
        },
        {
          key: "login",
          text: loading ? "Đang đăng nhập..." : "Đăng nhập Zalo",
          highLight: true,
          disabled: loading,
          onClick: onLogin,
        },
      ]}
    />
  );
}

type BusinessDialogMode =
  | "choices"
  | "checking"
  | "pending"
  | "approved-error"
  | "ubnd"
  | "check-error";

interface BusinessProfileRequiredDialogProps {
  visible: boolean;
  zaloId?: string | null;
  onClose: () => void;
}

export function BusinessProfileRequiredDialog({
  visible,
  zaloId,
  onClose,
}: BusinessProfileRequiredDialogProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<BusinessDialogMode>("choices");
  const [checkError, setCheckError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setMode("choices");
    setCheckError("");
  }, [visible]);

  const openBusinessRegistration = async () => {
    if (mode === "checking") return;

    setMode("checking");
    setCheckError("");
    try {
      let currentZaloId = zaloId?.trim();
      if (!currentZaloId) {
        const { userInfo } = await getUserInfo({ autoRequestPermission: true });
        currentZaloId = userInfo.id;
      }

      if (!currentZaloId) {
        throw new Error("Không lấy được Zalo ID để kiểm tra hồ sơ.");
      }

      const application = await checkBusinessApplicationByZaloId(currentZaloId);
      if (application.exists && application.status === "PENDING") {
        setMode("pending");
        return;
      }
      if (application.exists && application.status === "APPROVED") {
        setMode("approved-error");
        return;
      }
      if (application.exists && application.status === null) {
        throw new Error("Không xác định được trạng thái hồ sơ BUSINESS hiện tại.");
      }

      // REJECTED is handled by the existing registration screen, which loads
      // the application id and resubmits it with PATCH instead of creating a duplicate.
      navigate("/business/register");
    } catch (error: unknown) {
      setCheckError(
        error instanceof BusinessApplicationError || error instanceof Error
          ? error.message
          : "Không thể kiểm tra hồ sơ BUSINESS. Vui lòng thử lại."
      );
      setMode("check-error");
    }
  };

  if (mode === "pending") {
    return (
      <Modal
        visible={visible}
        title="Hồ sơ của bạn đang chờ duyệt"
        description="Bạn chưa thể đăng tin trong thời gian hồ sơ BUSINESS đang được xét duyệt. Vui lòng quay lại sau khi hồ sơ được duyệt."
        maskClosable
        onClose={onClose}
        actions={[
          { key: "close", text: "Đã hiểu", highLight: true, onClick: onClose },
        ]}
      />
    );
  }

  if (mode === "approved-error") {
    return (
      <Modal
        visible={visible}
        title="Quyền đăng tin chưa được cập nhật"
        description="Hồ sơ BUSINESS của bạn đã được duyệt nhưng tài khoản vẫn chưa có quyền đăng tin. Đây là lỗi hệ thống; vui lòng liên hệ quản trị viên để được kiểm tra."
        maskClosable
        onClose={onClose}
        verticalActions
        actions={[
          {
            key: "contact",
            text: "Xem thông tin liên hệ",
            highLight: true,
            onClick: () => navigate("/contacts/ubnd-xa-truong-mit"),
          },
          { key: "close", text: "Đóng", onClick: onClose },
        ]}
      />
    );
  }

  if (mode === "ubnd") {
    return (
      <Modal
        visible={visible}
        title="Đăng ký trực tiếp tại UBND"
        description="Bạn có thể đến UBND xã Truông Mít để được hỗ trợ đăng ký tài khoản kinh doanh trực tiếp. Cán bộ sẽ hướng dẫn và cấp tài khoản đăng nhập cho bạn."
        maskClosable
        onClose={onClose}
        verticalActions
        actions={[
          {
            key: "contact",
            text: "Xem địa chỉ và giờ làm việc",
            highLight: true,
            onClick: () => navigate("/contacts/ubnd-xa-truong-mit"),
          },
          {
            key: "back",
            text: "Quay lại lựa chọn",
            onClick: () => setMode("choices"),
          },
          { key: "close", text: "Đóng", onClick: onClose },
        ]}
      />
    );
  }

  if (mode === "check-error") {
    return (
      <Modal
        visible={visible}
        title="Chưa thể kiểm tra hồ sơ"
        description={checkError}
        maskClosable
        onClose={onClose}
        verticalActions
        actions={[
          {
            key: "retry",
            text: "Thử lại",
            highLight: true,
            onClick: () => void openBusinessRegistration(),
          },
          {
            key: "ubnd",
            text: "Đăng ký trực tiếp tại UBND",
            onClick: () => setMode("ubnd"),
          },
          { key: "close", text: "Đóng", onClick: onClose },
        ]}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      title={mode === "checking" ? "Đang kiểm tra hồ sơ" : "Cần tài khoản BUSINESS"}
      description={
        mode === "checking"
          ? "Vui lòng chờ trong khi hệ thống kiểm tra trạng thái hồ sơ của bạn."
          : "Để đăng tin giao thương, bạn cần có hồ sơ BUSINESS đã được duyệt. Chọn một trong hai cách đăng ký dưới đây."
      }
      maskClosable={mode !== "checking"}
      onClose={onClose}
      verticalActions
      actions={[
        {
          key: "in-app",
          text: mode === "checking" ? "Đang kiểm tra..." : "Đăng ký ngay trong app",
          highLight: true,
          disabled: mode === "checking",
          onClick: () => void openBusinessRegistration(),
        },
        {
          key: "ubnd",
          text: "Đăng ký trực tiếp tại UBND xã Truông Mít",
          disabled: mode === "checking",
          onClick: () => setMode("ubnd"),
        },
        {
          key: "later",
          text: "Để sau",
          disabled: mode === "checking",
          onClick: onClose,
        },
      ]}
    />
  );
}
