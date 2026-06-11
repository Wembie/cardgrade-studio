import Dexie, { type Table } from 'dexie'
import type { CardScan, GradingReport, CollectionEntry } from '@/shared/types'

export class CardGradeDB extends Dexie {
  scans!: Table<CardScan>
  reports!: Table<GradingReport>
  collection!: Table<CollectionEntry>

  constructor() {
    super('CardGradeStudio')

    this.version(1).stores({
      scans: 'id, name, createdAt, updatedAt, cardName, setName',
      reports: 'id, scanId, createdAt',
      collection: 'id, scanId, addedAt, cardName, setName, sport, estimatedGrade, gradingCompany',
    })
  }
}

export const db = new CardGradeDB()

/** Storage usage estimate */
export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return { used: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
  }
  return { used: 0, quota: 0 }
}

/** Clear all data */
export async function clearAllData(): Promise<void> {
  await Promise.all([db.scans.clear(), db.reports.clear(), db.collection.clear()])
}
