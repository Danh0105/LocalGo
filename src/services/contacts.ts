import {
  ContactCategory,
  ContactItem,
  contactItems,
} from "@/data/contacts";

export interface ContactQuery {
  category?: ContactCategory;
}

export async function getContacts(
  query: ContactQuery = {}
): Promise<ContactItem[]> {
  const { category } = query;

  return category
    ? contactItems.filter((contact) => contact.category === category)
    : contactItems;
}

export async function getContactById(
  id: string
): Promise<ContactItem | undefined> {
  return contactItems.find((contact) => contact.id === id);
}
