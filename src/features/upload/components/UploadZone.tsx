'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImagePlus, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { fileToDataUrl, formatBytes } from '@/shared/lib/utils'

interface UploadZoneProps {
  side: 'front' | 'back'
  currentDataUrl?: string | null
  onUpload: (dataUrl: string, file: File) => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tif', '.tiff'],
}

const MAX_FILE_SIZE = 50 * 1024 * 1024  // 50MB

export default function UploadZone({
  side,
  currentDataUrl,
  onUpload,
  onRemove,
  disabled = false,
  className,
}: UploadZoneProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (accepted: File[], rejected: FileRejection[]) => {
      setError(null)

      if (rejected.length > 0) {
        const err = rejected[0].errors[0]
        if (err.code === 'file-too-large') {
          setError(`File too large. Max ${formatBytes(MAX_FILE_SIZE)}.`)
        } else if (err.code === 'file-invalid-type') {
          setError('Invalid file type. Use JPEG, PNG, WebP, or TIFF.')
        } else {
          setError(err.message)
        }
        return
      }

      if (accepted.length === 0) return

      setIsProcessing(true)
      try {
        const file = accepted[0]
        const dataUrl = await fileToDataUrl(file)
        onUpload(dataUrl, file)
      } catch {
        setError('Failed to load image. Please try again.')
      } finally {
        setIsProcessing(false)
      }
    },
    [onUpload]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: disabled || isProcessing,
  })

  const hasImage = !!currentDataUrl

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait">
        {hasImage ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative rounded-xl overflow-hidden border border-border group"
          >
            <img
              src={currentDataUrl!}
              alt={`${side} of card`}
              className="w-full h-full object-contain max-h-64 bg-black/20"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                {...getRootProps()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm transition-colors border border-white/20"
              >
                <input {...getInputProps()} />
                <ImagePlus className="w-3.5 h-3.5" />
                Replace
              </button>
              {onRemove && (
                <button
                  onClick={onRemove}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition-colors border border-red-500/30"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
            {/* Badge */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-black/60 text-white border border-white/10 capitalize">
              {side}
            </div>
          </motion.div>
        ) : (
          <div
            key="dropzone"
            {...getRootProps()}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3',
              'rounded-xl border-2 border-dashed cursor-pointer',
              'min-h-[160px] px-4 py-6',
              'transition-all duration-200',
              isDragActive && !isDragReject
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : isDragReject
                ? 'border-destructive bg-destructive/5'
                : 'border-border hover:border-primary/50 hover:bg-secondary/30',
              disabled && 'opacity-50 cursor-not-allowed',
              isProcessing && 'opacity-60'
            )}
          >
            <input {...getInputProps()} />

            {/* Icon */}
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                'transition-colors duration-200',
                isDragActive && !isDragReject
                  ? 'bg-primary/20 text-primary'
                  : isDragReject
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Upload className="w-5 h-5" />
                </motion.div>
              ) : isDragReject ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <ImagePlus className="w-5 h-5" />
              )}
            </div>

            {/* Text */}
            <div className="text-center space-y-1">
              <p className={cn('text-sm font-medium', isDragReject ? 'text-destructive' : 'text-foreground')}>
                {isProcessing
                  ? 'Processing...'
                  : isDragActive && !isDragReject
                  ? 'Drop to upload'
                  : isDragReject
                  ? 'File not supported'
                  : `Upload ${side === 'front' ? 'Front' : 'Back'}`}
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, TIFF · Max {formatBytes(MAX_FILE_SIZE)}
              </p>
            </div>

            {/* Paste hint */}
            <p className="text-xs text-muted-foreground/60">
              Drag, click, or paste (Ctrl+V)
            </p>
          </div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 flex items-start gap-1.5 text-xs text-destructive"
          >
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
