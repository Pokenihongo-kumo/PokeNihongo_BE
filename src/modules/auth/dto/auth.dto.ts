import { ApiProperty } from '@nestjs/swagger'

export class RegisterMultipartSwaggerDTO {
  @ApiProperty({
    example: 'John Doe',
    description: 'Tên của người dùng'
  })
  name: string

  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email của người dùng'
  })
  email: string

  @ApiProperty({
    example: 'password123',
    description: 'Mật khẩu'
  })
  password: string

  @ApiProperty({
    example: '0986056438',
    description: 'Số điện thoại'
  })
  phoneNumber: string

  @ApiProperty({
    example: 'k3Jv...',
    description: 'Token một lần từ POST /auth/verify-otp (type REGISTER) của email này'
  })
  registrationToken: string
}

export class LoginBodySwaggerDTO {
  @ApiProperty({
    example: 'admin2025@gmail.com',
    description: 'Địa chỉ email của người dùng'
  })
  email: string

  @ApiProperty({
    example: '123456',
    description: 'Mật khẩu'
  })
  password: string
}

export class UpdateMeMultipartSwaggerDTO {
  @ApiProperty({
    example: 'John Doe',
    description: 'Tên của người dùng'
  })
  name: string

  @ApiProperty({
    example: '0986056438',
    description: 'Số điện thoại'
  })
  phoneNumber: string

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Avatar file (chỉ chấp nhận file ảnh: JPEG, PNG, WEBP, GIF. Tối đa 5MB)',
    required: false
  })
  avatar?: any
}
