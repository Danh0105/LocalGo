import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContentReviews from "./index";
import ReviewForm from "./review-form";
import type { ContentReview } from "@/types/content-reviews";

const mocks = vi.hoisted(() => ({
  getContentReviews: vi.fn(),
  getContentReviewSummary: vi.fn(),
  getMyContentReview: vi.fn(),
  saveContentReview: vi.fn(),
  deleteContentReview: vi.fn(),
  uploadContentImages: vi.fn(),
  authenticate: vi.fn(),
}));
vi.mock("@/services/content-reviews", () => mocks);
vi.mock("@/services/media", () => ({
  uploadContentImages: mocks.uploadContentImages,
}));
vi.mock("zmp-ui", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/contexts/auth-context", () => ({
  useCurrentUser: () => ({
    accessToken: "token",
    authenticate: mocks.authenticate,
  }),
}));
const own: ContentReview = {
  id: "review",
  targetType: "temples",
  targetId: "chua",
  userId: "user",
  rating: 4,
  content: "Không gian yên bình",
  status: "HIDDEN",
  replyContent: null,
  repliedAt: null,
  images: [],
  reviewer: { id: "user", displayName: "Nguyễn An", avatarUrl: null },
  createdAt: "2026-10-21T08:00:00Z",
  updatedAt: "2026-10-21T08:00:00Z",
};
const score = {
  average: 0,
  total: 0,
  counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getContentReviews.mockResolvedValue({
    items: [],
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
  });
  mocks.getContentReviewSummary.mockResolvedValue(score);
  mocks.getMyContentReview.mockResolvedValue(null);
  mocks.deleteContentReview.mockResolvedValue(undefined);
  mocks.saveContentReview.mockResolvedValue({ ...own, status: "PUBLISHED" });
  mocks.uploadContentImages.mockResolvedValue([]);
});
afterEach(cleanup);

describe("content reviews", () => {
  it("loads a hidden own review, edits using PATCH identity and preserves hidden status", async () => {
    mocks.getMyContentReview.mockResolvedValue(own);
    mocks.saveContentReview.mockResolvedValue(own);
    render(
      <ContentReviews
        targetType="temples"
        targetId="chua"
        title="Chùa địa phương"
      />,
    );
    await screen.findByText("Không gian yên bình");
    fireEvent.click(screen.getAllByRole("button", { name: "Sửa đánh giá" })[0]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "  Trải nghiệm mới  " },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Lưu thay đổi" }),
    );
    await waitFor(() =>
      expect(mocks.saveContentReview).toHaveBeenCalledWith(
        "temples",
        "chua",
        "token",
        { rating: 4, content: "Trải nghiệm mới", imageIds: [] },
        "review",
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "vẫn đang được ẩn",
    );
  });

  it("requires confirmation before deleting and allows writing again", async () => {
    mocks.getMyContentReview.mockResolvedValue(own);
    render(
      <ContentReviews targetType="temples" targetId="chua" title="Chùa" />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Xóa đánh giá" }),
    );
    expect(mocks.deleteContentReview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    await waitFor(() =>
      expect(mocks.deleteContentReview).toHaveBeenCalledWith("review", "token"),
    );
    expect(
      await screen.findByRole("button", { name: "Viết đánh giá" }),
    ).toBeInTheDocument();
  });

  it("validates rating, whitespace content and a maximum of three photos before saving", async () => {
    const save = vi.fn();
    render(
      <ReviewForm
        title="Chùa"
        review={null}
        onClose={() => undefined}
        onSave={save}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
    expect(screen.getByRole("alert")).toHaveTextContent("chọn số sao");
    fireEvent.click(screen.getByRole("radio", { name: "5 sao" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
    expect(screen.getByRole("alert")).toHaveTextContent("1 đến 1000");
    fireEvent.change(screen.getByLabelText("Thêm ảnh trải nghiệm"), {
      target: {
        files: Array.from(
          { length: 4 },
          () => new File(["x"], "a.png", { type: "image/png" }),
        ),
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("tối đa 3 ảnh");
    expect(save).not.toHaveBeenCalled();
  });

  it("retains existing photo IDs and sends an empty replacement array after removal", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const photoReview = {
      ...own,
      images: [
        { id: "photo", url: "/test.jpg", thumbnailUrl: null, sortOrder: 0 },
      ],
    };
    render(
      <ReviewForm
        title="Chùa"
        review={photoReview}
        onClose={() => undefined}
        onSave={save}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Xóa ảnh 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        rating: 4,
        content: own.content,
        retainedIds: [],
        files: [],
      }),
    );
  });
});
