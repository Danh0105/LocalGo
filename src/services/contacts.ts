import phoneIcon from "@/static/phone.png";
import { ContactCategory, ContactItem } from "@/data/contacts";

export interface ContactQuery {
  category?: ContactCategory;
}

interface ContactApiItem {
  id: string;
  googleMapsUrl?: string | null;
  name: string;
  category: ContactCategory;
  role: string;
  phone: string;
  email: string | null;
  address: string;
  workingTime: string;
  summary: string;
  description: string[];
  supportTopics: string[];
  note: string;
  imageUrl: string | null;
  imageAlt: string;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.localgo.skilltripx.com.vn/api/v1";

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED");
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}

function toContactItem(item: ContactApiItem): ContactItem {
  return {
    id: item.id,
    googleMapsUrl: item.googleMapsUrl ?? null,
    name: item.name,
    category: item.category,
    role: item.role,
    phone: item.phone,
    email: item.email ?? undefined,
    address: item.address,
    workingTime: item.workingTime,
    summary: item.summary,
    description: item.description,
    supportTopics: item.supportTopics,
    note: item.note,
    image: item.imageUrl ?? phoneIcon,
  };
}

export async function getContacts(
  query: ContactQuery = {}
): Promise<ContactItem[]> {
  const { category } = query;
  const search = category ? `?category=${encodeURIComponent(category)}` : "";
  const items = await get<ContactApiItem[]>(`/contacts${search}`);
  return items.map(toContactItem);
}

export async function getContactById(
  id: string,
  signal?: AbortSignal
): Promise<ContactItem | undefined> {
  try {
    const item = await get<ContactApiItem>(
      `/contacts/${encodeURIComponent(id)}`,
      signal
    );
    return toContactItem(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
