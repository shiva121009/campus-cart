const KEY = "campuscart:recent";

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(item) {
  if (!item?.id) return;
  const entry = {
    id: item.id,
    title: item.title,
    price: item.price,
    image: item.image,
    category: item.category,
  };
  const list = getRecentlyViewed().filter((x) => x.id !== entry.id);
  list.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 12)));
}
