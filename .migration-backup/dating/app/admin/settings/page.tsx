import prisma from '@/lib/prisma'
import AdminSettings from '@/components/admin/AdminSettings'

export default async function AdminSettingsPage() {
  const config = await prisma.config.findFirst().catch(() => null)
  const creditPackages = await prisma.creditPackage.findMany({ orderBy: { price: 'asc' } }).catch(() => [])
  const premiumPackages = await prisma.premiumPackage.findMany({ orderBy: { price: 'asc' } }).catch(() => [])
  return <AdminSettings config={config as any} creditPackages={creditPackages as any} premiumPackages={premiumPackages as any} />
}
