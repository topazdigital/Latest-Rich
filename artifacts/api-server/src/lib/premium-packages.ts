import { db } from "@workspace/db"
import { siteConfigTable } from "@workspace/db/schema"

export interface PremiumPackage {
  id: number
  name: string
  days: number
  price: number
  popular: number
  description: string
  active: number
  priority: number
}

export const DEFAULT_PREMIUM_PACKAGES: PremiumPackage[] = [
  { id: 1, name: "1 Month", days: 30, price: 9.99, popular: 0, description: "Flexible monthly plan", active: 1, priority: 1 },
  { id: 2, name: "3 Months", days: 90, price: 24.99, popular: 1, description: "Save 17%", active: 1, priority: 2 },
  { id: 3, name: "6 Months", days: 180, price: 39.99, popular: 0, description: "Save 33%", active: 1, priority: 3 },
  { id: 4, name: "1 Year", days: 365, price: 59.99, popular: 0, description: "Best value — Save 50%", active: 1, priority: 4 },
]

export async function getPremiumPackages(): Promise<Record<number, PremiumPackage>> {
  try {
    const configs = await db.select().from(siteConfigTable)
    const map = new Map<string, string>(
      configs.map((c: any) => [String(c.key), String(c.value || "")] as [string, string])
    )
    const packages: Record<number, PremiumPackage> = {}

    for (let i = 1; i <= 8; i++) {
      const name = map.get(`premium_pkg_${i}_name`)
      if (!name) continue
      const days = Math.max(1, parseInt(map.get(`premium_pkg_${i}_days`) || "30", 10) || 30)
      const price = Math.max(0, parseFloat(map.get(`premium_pkg_${i}_price`) || "0") || 0)
      const priority = Math.max(1, parseInt(map.get(`premium_pkg_${i}_priority`) || String(i), 10) || i)
      const active = parseInt(map.get(`premium_pkg_${i}_active`) || "1", 10)
      if (active !== 1) continue
      packages[i] = {
        id: i,
        name: String(name),
        days,
        price,
        popular: parseInt(map.get(`premium_pkg_${i}_popular`) || "0", 10) || 0,
        description: String(map.get(`premium_pkg_${i}_description`) || ""),
        active,
        priority,
      }
    }

    return Object.keys(packages).length > 0
      ? packages
      : Object.fromEntries(DEFAULT_PREMIUM_PACKAGES.map(pkg => [pkg.id, pkg]))
  } catch {
    return Object.fromEntries(DEFAULT_PREMIUM_PACKAGES.map(pkg => [pkg.id, pkg]))
  }
}

export async function getPremiumPackage(packageId: number): Promise<PremiumPackage | undefined> {
  const packages = await getPremiumPackages()
  return packages[packageId]
}

export function premiumPackageList(packages: Record<number, PremiumPackage>): PremiumPackage[] {
  return Object.values(packages).sort((a, b) => a.id - b.id)
}