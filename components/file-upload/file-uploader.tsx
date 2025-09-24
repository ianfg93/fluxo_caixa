"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, File, Image, Check } from "lucide-react"
import { FileUploadService, type UploadedFile } from "@/lib/file-upload"
import { useAuth } from "@/hooks/use-auth"

interface FileUploaderProps {
  onFileUploaded: (file: UploadedFile) => void
  acceptedTypes?: string
  maxSize?: number // in MB
  multiple?: boolean
}

export function FileUploader({
  onFileUploaded,
  acceptedTypes = "image/*,.pdf,.doc,.docx",
  maxSize = 10,
  multiple = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile>>({})
  const { authState } = useAuth()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    if (!authState.user) return

    for (const file of files) {
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        alert(`Arquivo ${file.name} é muito grande. Tamanho máximo: ${maxSize}MB`)
        continue
      }

      const fileId = `${file.name}-${Date.now()}`

      try {
        // Start upload progress
        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }))

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const currentProgress = prev[fileId] || 0
            if (currentProgress >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return { ...prev, [fileId]: currentProgress + 10 }
          })
        }, 200)

        // Upload file
        const uploadedFile = await FileUploadService.uploadFile(file, authState.user.name)

        // Complete progress
        clearInterval(progressInterval)
        setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))
        setUploadedFiles((prev) => ({ ...prev, [fileId]: uploadedFile }))

        // Notify parent component
        onFileUploaded(uploadedFile)

        // Clean up after 2 seconds
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newProgress = { ...prev }
            delete newProgress[fileId]
            return newProgress
          })
          setUploadedFiles((prev) => {
            const newFiles = { ...prev }
            delete newFiles[fileId]
            return newFiles
          })
        }, 2000)
      } catch (error) {
        console.error("Upload failed:", error)
        setUploadProgress((prev) => {
          const newProgress = { ...prev }
          delete newProgress[fileId]
          return newProgress
        })
        alert(`Erro ao fazer upload do arquivo ${file.name}`)
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    return FileUploadService.formatFileSize(bytes)
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Arraste arquivos aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">
                Tipos aceitos: {acceptedTypes.replace(/\*/g, "todos")} • Tamanho máximo: {maxSize}MB
              </p>
            </div>
            <input
              type="file"
              accept={acceptedTypes}
              multiple={multiple}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button asChild className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                Selecionar Arquivos
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).map(([fileId, progress]) => {
        const fileName = fileId.split("-")[0]
        const uploadedFile = uploadedFiles[fileId]

        return (
          <Card key={fileId}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {uploadedFile ? (
                  FileUploadService.isImageFile(uploadedFile.type) ? (
                    <Image className="h-8 w-8 text-blue-600" />
                  ) : (
                    <File className="h-8 w-8 text-gray-600" />
                  )
                ) : (
                  <File className="h-8 w-8 text-gray-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{fileName}</p>
                    {progress === 100 ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{progress}%</span>
                    )}
                  </div>
                  {uploadedFile && (
                    <p className="text-xs text-muted-foreground mb-2">{formatFileSize(uploadedFile.size)}</p>
                  )}
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
