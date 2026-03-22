import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "bookmarkedProperties";

export async function getBookmarks(): Promise<string[]> {
  try {
    const val = await AsyncStorage.getItem(KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function toggleBookmark(id: string): Promise<{ bookmarks: string[]; added: boolean }> {
  const list = await getBookmarks();
  if (list.includes(id)) {
    const next = list.filter((x) => x !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return { bookmarks: next, added: false };
  }
  const next = [...list, id];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return { bookmarks: next, added: true };
}

export async function isBookmarked(id: string): Promise<boolean> {
  const list = await getBookmarks();
  return list.includes(id);
}
