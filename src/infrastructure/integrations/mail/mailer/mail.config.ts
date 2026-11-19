import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs'
import * as Handlebars from 'handlebars'
import * as moment from 'moment'
import { join } from 'path'

export const templateDir =
  process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'Production'
    ? join(process.cwd(), 'dist/infrastructure/integrations/mail/templates')
    : join(process.cwd(), 'src/infrastructure/integrations/mail/templates')

export function registerHandlebarsHelpers() {
  Handlebars.registerHelper('formatDate', (date: Date, format = 'DD/MM/YYYY') => {
    if (!date) return ''
    return moment.default(date).format(format)
  })
  Handlebars.registerHelper(
    'formatPrice',
    (price: number) => price?.toLocaleString('vi-VN') ?? ''
  )
  Handlebars.registerHelper('formatCurrency', (v: number) =>
    v == null
      ? ''
      : Number(v).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
  )
  Handlebars.registerHelper('gt', (a, b) => a > b)
  Handlebars.registerHelper('eq', (a, b) => a === b)
  Handlebars.registerHelper('split', (s: string) =>
    typeof s === 'string' ? s.split('') : []
  )
}

export const mailerConfigFactory = async (configService: ConfigService) => {
  if (!fs.existsSync(templateDir)) {
    console.error(`Template directory does not exist: ${templateDir}`)
  }

  return {
    transport: {
      host: configService.get<string>('MAIL_HOST'),
      port: configService.get<number>('MAIL_PORT'),
      secure: true,
      auth: {
        user: configService.get<string>('MAIL_USER'),
        pass: configService.get<string>('MAIL_PASSWORD')
      }
    },
    defaults: { from: '"No Reply" <no-reply@example.com>' },
    template: {
      dir: templateDir,
      adapter: new HandlebarsAdapter(),
      options: { strict: true }
    }
  }
}
