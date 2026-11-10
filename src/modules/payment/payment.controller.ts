import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res
} from '@nestjs/common'
import { ApiOperation, ApiResponse } from '@nestjs/swagger'
import { CreatePayOSPaymentDto } from './entities/payment.model'
import { PaymentService } from './payment.service'

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('/payos')
  @ApiOperation({ summary: 'Tạo thanh toán PayOS' })
  @ApiResponse({ status: 201, description: 'Tạo link thanh toán thành công' })
  async createPayOSPayment(
    @Body() paymentData: CreatePayOSPaymentDto,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.paymentService.createPayOSPayment(paymentData, userId, lang)
  }

  @Get('/payos/return')
  @IsPublic()
  @ApiOperation({ summary: 'PayOS return URL handler' })
  @ApiResponse({ status: 302, description: 'Redirect về frontend' })
  // code/status/cancel in the query are ignored: the state comes from PayOS
  async handlePayOSReturn(
    @Query('orderCode') orderCode: string,
    @Res() res: any,
    @I18nLang() lang: string
  ) {
    const result = await this.paymentService.handlePayOSReturn(
      { orderCode: parseInt(orderCode) },
      lang
    )

    // Redirect về frontend
    return res.redirect(result.redirect)
  }

  @Get('/payos/cancel')
  @IsPublic()
  @ApiOperation({ summary: 'PayOS cancel URL handler' })
  @ApiResponse({ status: 302, description: 'Redirect về frontend' })
  async handlePayOSCancel(
    @Query('orderCode') orderCode: string,
    @Res() res: any,
    @I18nLang() lang: string
  ) {
    const result = await this.paymentService.handlePayOSCancel(
      { orderCode: parseInt(orderCode) },
      lang
    )
    // Redirect về frontend
    return res.redirect(result.redirect)
  }

  // Payment notifications from PayOS; the body is trusted only after the SDK
  // verifies its signature with PAYOS_CHECKSUM_KEY
  @Post('/payos/webhook')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PayOS webhook' })
  @ApiResponse({ status: 200, description: 'Webhook xử lý thành công' })
  async handlePayOSWebhook(@Body() body: unknown, @I18nLang() lang: string) {
    return this.paymentService.handlePayOSWebhook(body, lang)
  }
}
