import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "compareList";
const MAX = 3;

export async function getCompareList(): Promise<string[]> {
  try {
    const val = await AsyncStorage.getItem(KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function toggleCompareItem(id: string): Promise<{ list: string[]; added: boolean; maxReached: boolean }> {
  const list = await getCompareList();
  if (list.includes(id)) {
    const next = list.filter((x) => x !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return { list: next, added: false, maxReached: false };
  }
  if (list.length >= MAX) {
    return { list, added: false, maxReached: true };
  }
  const next = [...list, id];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return { list: next, added: true, maxReached: false };
}

export async function isInCompareList(id: string): Promise<boolean> {
  const list = await getCompareList();
  return list.includes(id);
}
