import { GachaBannerStatus } from '@/common/constants/shop-banner.constant'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const GachaBannerSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  status: z
    .enum([
      GachaBannerStatus.ACTIVE,
      GachaBannerStatus.INACTIVE,
      GachaBannerStatus.EXPIRED,
      GachaBannerStatus.PREVIEW
    ])
    .default(GachaBannerStatus.PREVIEW),
  enablePrecreate: z.boolean().default(false), // bật/tắt tự tạo
  precreateBeforeEndDays: z.number().min(0).default(2), // tạo trước X ngày (mặc định 2)
  isRandomItemAgain: z.boolean().default(false), // có thể trùng item khi random lại
  hardPity5Star: z.number().default(200),
  costRoll: z.number().default(100),
  amount5Star: z.number().min(1).max(18).default(1),
  amount4Star: z.number().min(2).max(39).default(3),
  amount3Star: z.number().min(3).max(400).default(6),
  amount2Star: z.number().min(4).max(500).default(8),
  amount1Star: z.number().min(5).max(150).default(10),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetGachaBannerDetailByUserSchema = GachaBannerSchema.extend({
  nameTranslation: z.string(),
  pokemon: PokemonSchema.pick({
    id: true,
    pokedex_number: true,
    nameJp: true,
    nameTranslations: true,
    imageUrl: true,
    rarity: true
  })
    .extend({
      starType: z.string()
    })
    .nullable()
})

export type GachaBanner = z.infer<typeof GachaBannerSchema>
type GachaBannerFieldType = keyof z.infer<typeof GachaBannerSchema>
export const GACHA_BANNER_FIELDS = [
  ...Object.keys(GachaBannerSchema.shape),
  'nameTranslation'
] as GachaBannerFieldType[]
