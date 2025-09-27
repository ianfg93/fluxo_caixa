export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: Date
  uploadedBy: string
}

export interface FileAttachment {
  id: string
  entityType: "transaction" | "account_payable"
  entityId: string
  fileId: string
  fileName: string
  fileUrl: string
  createdAt: Date
}

const mockFiles: UploadedFile[] = [
  {
    id: "1",
    name: "nota-fiscal-001234.pdf",
    size: 245760,
    type: "application/pdf",
    url: "/pdf-icon.png",
    uploadedAt: new Date("2024-03-15T10:30:00"),
    uploadedBy: "Maria Santos",
  },
  {
    id: "2",
    name: "recibo-pagamento.jpg",
    size: 156432,
    type: "image/jpeg",
    url: "/receipt-photo.jpg",
    uploadedAt: new Date("2024-03-14T14:20:00"),
    uploadedBy: "João Silva",
  },
]

const mockAttachments: FileAttachment[] = [
  {
    id: "1",
    entityType: "account_payable",
    entityId: "1",
    fileId: "1",
    fileName: "nota-fiscal-001234.pdf",
    fileUrl: "/pdf-icon.png",
    createdAt: new Date("2024-03-15T10:30:00"),
  },
]

export class FileUploadService {
  static async uploadFile(file: File, uploadedBy: string): Promise<UploadedFile> {

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const uploadedFile: UploadedFile = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: `/placeholder.svg?height=200&width=300&query=${encodeURIComponent(file.name)}`,
      uploadedAt: new Date(),
      uploadedBy,
    }

    mockFiles.unshift(uploadedFile)
    return uploadedFile
  }

  static attachFileToEntity(
    entityType: "transaction" | "account_payable",
    entityId: string,
    fileId: string,
    fileName: string,
    fileUrl: string,
  ): FileAttachment {
    const attachment: FileAttachment = {
      id: Date.now().toString(),
      entityType,
      entityId,
      fileId,
      fileName,
      fileUrl,
      createdAt: new Date(),
    }

    mockAttachments.unshift(attachment)
    return attachment
  }

  static getAttachments(entityType: "transaction" | "account_payable", entityId: string): FileAttachment[] {
    return mockAttachments.filter((a) => a.entityType === entityType && a.entityId === entityId)
  }

  static deleteAttachment(attachmentId: string): boolean {
    const index = mockAttachments.findIndex((a) => a.id === attachmentId)
    if (index === -1) return false

    mockAttachments.splice(index, 1)
    return true
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  static isImageFile(type: string): boolean {
    return type.startsWith("image/")
  }

  static isPdfFile(type: string): boolean {
    return type === "application/pdf"
  }
}
