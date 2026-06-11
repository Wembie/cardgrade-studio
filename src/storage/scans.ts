import { db } from './db'
import type { CardScan, CardImage, CardSide } from '@/shared/types'
import { generateId } from '@/shared/lib/utils'

export async function createScan(partial: Partial<CardScan> = {}): Promise<CardScan> {
  const now = Date.now()
  const scan: CardScan = {
    id: generateId(),
    name: 'Untitled Scan',
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
  await db.scans.add(scan)
  return scan
}

export async function getScan(id: string): Promise<CardScan | undefined> {
  return db.scans.get(id)
}

export async function getAllScans(): Promise<CardScan[]> {
  return db.scans.orderBy('createdAt').reverse().toArray()
}

export async function updateScan(id: string, updates: Partial<CardScan>): Promise<void> {
  await db.scans.update(id, { ...updates, updatedAt: Date.now() })
}

export async function setScanImage(
  scanId: string,
  side: CardSide,
  image: Omit<CardImage, 'id' | 'side'>
): Promise<void> {
  const cardImage: CardImage = { ...image, id: generateId(), side }
  await db.scans.update(scanId, {
    [side]: cardImage,
    updatedAt: Date.now(),
  })
}

export async function deleteScan(id: string): Promise<void> {
  await Promise.all([db.scans.delete(id), db.reports.where('scanId').equals(id).delete()])
}

export async function recentScans(limit = 20): Promise<CardScan[]> {
  return db.scans.orderBy('updatedAt').reverse().limit(limit).toArray()
}
