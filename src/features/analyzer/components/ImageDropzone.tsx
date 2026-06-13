'use client'

import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Upload } from 'lucide-react'

interface ImageDropzoneProps {
  onImageSelected: (file: File) => void
}

export function ImageDropzone({ onImageSelected }: ImageDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: false,
    onDropAccepted(files) {
      if (files[0]) onImageSelected(files[0])
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full h-full"
    >
      <div
        {...getRootProps()}
        className={[
          'flex flex-col items-center justify-center w-full h-full rounded-2xl',
          'bg-card border-2 border-dashed transition-colors duration-200 cursor-pointer',
          'select-none outline-none',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/60',
        ].join(' ')}
      >
        <input {...getInputProps()} />

        <motion.div
          className="flex flex-col items-center gap-4 px-6 text-center pointer-events-none"
          animate={isDragActive ? { scale: 1.06 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Icon */}
          <div
            className={[
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-200',
              isDragActive
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground',
            ].join(' ')}
          >
            <Upload className="w-7 h-7" />
          </div>

          {/* Text */}
          {isDragActive ? (
            <p className="text-base font-semibold text-primary">Release to upload</p>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">Drop your card here</p>
                <p className="text-sm text-muted-foreground">
                  or tap to browse your files
                </p>
              </div>
              <p className="text-xs text-muted-foreground/70">PNG, JPG, WEBP supported</p>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
