import { Modal } from "zmp-ui";

interface ZaloAuthDialogProps {
  visible: boolean;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

function ZaloAuthDialog({
  visible,
  loading,
  error,
  onRetry,
  onClose,
}: ZaloAuthDialogProps) {
  return (
    <Modal
      visible={visible}
      title={loading ? "Đang xác thực Zalo" : "Chưa thể xác thực Zalo"}
      description={
        loading
          ? "Vui lòng chờ trong giây lát để LocalGo xác thực tài khoản của bạn."
          : error || "Không thể xác thực tài khoản Zalo. Vui lòng thử lại."
      }
      maskClosable={!loading}
      onClose={onClose}
      actionsDivider
      actions={
        loading
          ? []
          : [
              {
                key: "cancel",
                text: "Để sau",
                onClick: onClose,
              },
              {
                key: "retry",
                text: "Thử lại",
                highLight: true,
                onClick: onRetry,
              },
            ]
      }
    />
  );
}

export default ZaloAuthDialog;
