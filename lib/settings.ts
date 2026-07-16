import { promises as fs } from "fs";
import path from "path";
import { dataDir } from "@/lib/paths";

export type UserSettings = {
  isPro: boolean;
  proSince: string | null;
};

const SETTINGS_FILE = () => path.join(dataDir(), "settings.json");

const DEFAULTS: UserSettings = {
  isPro: false,
  proSince: null,
};

export async function getSettings(): Promise<UserSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE(), "utf8");
    return { ...DEFAULTS, ...(JSON.parse(raw) as UserSettings) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setPro(enabled: boolean): Promise<UserSettings> {
  const next: UserSettings = {
    isPro: enabled,
    proSince: enabled ? new Date().toISOString() : null,
  };
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(SETTINGS_FILE(), JSON.stringify(next, null, 2));
  return next;
}
