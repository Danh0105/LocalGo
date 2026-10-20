import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ContentGallery from "./content-gallery";

afterEach(cleanup);
const gallery = [
  { mediaId: "b", imageUrl: "/second.jpg", thumbnailUrl: "/second-thumb.jpg", sortOrder: 2 },
  { mediaId: "a", imageUrl: "/first.jpg", thumbnailUrl: null, sortOrder: 1 },
];

describe("shared content gallery", () => {
  it("preserves the single-cover experience for legacy content", () => {
    render(<ContentGallery imageUrl="/cover.jpg" title="Lễ hội" fallbackSrc="/placeholder.png" />);
    expect(screen.getByRole("button", { name: "Lễ hội" })).toHaveAttribute("src", "/cover.jpg");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("sorts images, switches the hero and opens the selected image in the swipe viewer", async () => {
    const user = userEvent.setup();
    render(<ContentGallery imageUrl="/cover.jpg" imageAlt="Lễ hội địa phương" title="Lễ hội" fallbackSrc="/placeholder.png" galleryImages={gallery} />);
    const thumbs = screen.getByRole("navigation");
    expect(within(thumbs).getAllByRole("presentation")[2]).toHaveAttribute("src", "/second-thumb.jpg");
    await user.click(within(thumbs).getByRole("button", { name: "Xem ảnh 2" }));
    const hero = screen.getByRole("button", { name: "Lễ hội địa phương - ảnh 2" });
    expect(hero).toHaveAttribute("src", "/first.jpg");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    await user.click(hero);
    const viewer = screen.getByRole("dialog");
    expect(within(viewer).getByText("2/3")).toBeInTheDocument();
    const stage = viewer.querySelector(".app-image-viewer__stage")!;
    fireEvent.touchStart(stage, { changedTouches: [{ clientX: 200 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 90 }] });
    expect(within(viewer).getByText("3/3")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the placeholder as the initial image when there is no cover", () => {
    render(<ContentGallery imageUrl={null} title="Tour" fallbackSrc="/placeholder.png" galleryImages={gallery} />);
    expect(screen.getByRole("button", { name: "Tour" })).toHaveAttribute("src", "/placeholder.png");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("uses a local fallback on image failure without replacing the gallery order", async () => {
    render(<ContentGallery imageUrl="/cover.jpg" title="Tour" fallbackSrc="/cover.jpg" galleryImages={gallery} />);
    const hero = screen.getByRole("button", { name: "Tour" });
    fireEvent.error(hero);
    expect(hero.getAttribute("src")).toContain("image-placeholder.svg");
    expect(screen.getByText("Ảnh chưa tải được")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });
});
