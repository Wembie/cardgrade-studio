import { db } from './db'
import type { GradingReport } from '@/shared/types'
import { generateId } from '@/shared/lib/utils'

export async function saveReport(report: Omit<GradingReport, 'id' | 'createdAt'>): Promise<GradingReport> {
  const full: GradingReport = { ...report, id: generateId(), createdAt: Date.now() }
  await db.reports.add(full)
  return full
}

export async function getReportsForScan(scanId: string): Promise<GradingReport[]> {
  return db.reports.where('scanId').equals(scanId).reverse().sortBy('createdAt')
}

export async function getLatestReport(scanId: string): Promise<GradingReport | undefined> {
  const all = await getReportsForScan(scanId)
  return all[0]
}

export async function getAllReports(): Promise<GradingReport[]> {
  return db.reports.orderBy('createdAt').reverse().toArray()
}

export async function deleteReport(id: string): Promise<void> {
  await db.reports.delete(id)
}
