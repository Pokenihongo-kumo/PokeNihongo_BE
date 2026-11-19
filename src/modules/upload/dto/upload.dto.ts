import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class UploadImageDTO {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File hình ảnh (JPEG, PNG, WEBP, GIF). Tối đa 3MB',
    required: true
  })
  image: any

  @ApiProperty({
    example: 'pokemon',
    description: 'Tên folder để upload (pokemon, avatar, vocabulary, etc.)',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  folderName: string
}

export class UploadImageResponseDTO {
  @ApiProperty({
    example: 'Upload hình ảnh thành công!',
    description: 'Thông báo kết quả'
  })
  message: string

  @ApiProperty({
    example:
      'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/pokemon/image.jpg',
    description: 'URL của file đã upload'
  })
  url: string

  @ApiProperty({
    example: 'pokemon/image',
    description: 'Public ID của file trên Cloudinary',
    required: false
  })
  publicId?: string
}
