import { GachaBannerStatus } from '@/common/constants/shop-banner.constant'
import { addDaysUTC0000, todayUTCWith0000 } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { GachaStarType } from '@prisma/client'
import { GachaItemService } from 'src/modules/gacha-item/gacha-item.service'
import { LanguagesRepo } from 'src/modules/languages/languages.repo'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class HandleGachaBannerCronjob {
  private readonly logger = new Logger(HandleGachaBannerCronjob.name)
  constructor(
    private prismaService: PrismaService,
    private gachaItemService: GachaItemService,
    private languageRepo: LanguagesRepo
  ) {}

  // Chạy mỗi ngày lúc 00:00
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleGachaBannerStatus() {
    const now = todayUTCWith0000()
    this.logger.log(`[GachaBanner Cronjob Status] Running at ${now.toISOString()}`)

    try {
      // 1. Chuyển các banner ACTIVE có endDate < today sang EXPIRED
      const expiredResult = await this.prismaService.gachaBanner.updateMany({
        where: {
          status: GachaBannerStatus.ACTIVE,
          endDate: {
            lt: now
          },
          deletedAt: null
        },
        data: {
          status: GachaBannerStatus.EXPIRED
        }
      })
      this.logger.verbose(
        `[GachaBanner Cronjob] Expired ${expiredResult.count} ACTIVE banners`
      )

      // 2. Lấy danh sách banner có status PREVIEW, hợp lệ về thời gian
      // Điều kiện: startDate <= today AND endDate >= today
      const previewBanners = await this.prismaService.gachaBanner.findMany({
        where: {
          status: GachaBannerStatus.PREVIEW,
          deletedAt: null,
          AND: [
            {
              OR: [{ startDate: null }, { startDate: { lte: now } }]
            },
            {
              OR: [{ endDate: null }, { endDate: { gte: now } }]
            }
          ]
        },
        orderBy: {
          startDate: 'asc' // Sort theo startDate tăng dần
        }
      })

      // 3. Nếu có ít nhất 1 banner PREVIEW hợp lệ, chỉ activate khi có ít hơn 2 banner ACTIVE
      if (previewBanners.length > 0) {
        const activeCount = await this.prismaService.gachaBanner.count({
          where: {
            status: GachaBannerStatus.ACTIVE,
            deletedAt: null
          }
        })

        const MAX_ACTIVE_BANNERS = 2

        if (activeCount >= MAX_ACTIVE_BANNERS) {
          this.logger.log(
            `[GachaBanner Cronjob] Skipped activation: already ${activeCount} ACTIVE banners (max=${MAX_ACTIVE_BANNERS})`
          )
        } else {
          const bannerToActivate = previewBanners[0]
          await this.prismaService.gachaBanner.update({
            where: {
              id: bannerToActivate.id
            },
            data: {
              status: GachaBannerStatus.ACTIVE
            }
          })
          this.logger.log(
            `[GachaBanner Cronjob] Activated PREVIEW banner: ID=${bannerToActivate.id}, nameKey=${bannerToActivate.nameKey}`
          )
        }
      } else {
        this.logger.log('[GachaBanner Cronjob] No eligible PREVIEW banner to activate')
      }

      this.logger.log('[GachaBanner Cronjob] Completed successfully')
    } catch (error) {
      this.logger.error('[GachaBanner Cronjob] Error:', error)
      throw error
    }
  }

  // Chạy mỗi ngày lúc 01:00 để tự động tạo banner mới
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handlePrecreateGachaBanner() {
    const now = todayUTCWith0000()
    this.logger.log(`[GachaBanner Precreate] Running at ${now.toISOString()}`)

    try {
      // 1. Tìm các banner ACTIVE có enablePrecreate = true
      //    và endDate - precreateBeforeEndDays <= now (đã đến thời điểm cần tạo banner mới)
      const activeBanners = await this.prismaService.gachaBanner.findMany({
        where: {
          status: GachaBannerStatus.ACTIVE,
          enablePrecreate: true,
          deletedAt: null
        },
        include: {
          nameTranslations: true,
          items: {
            include: {
              pokemon: true,
              gachaItemRate: true
            }
          }
        }
      })

      for (const banner of activeBanners) {
        try {
          // Kiểm tra xem đã đến thời điểm cần tạo banner mới chưa
          if (!banner.endDate) {
            this.logger.warn(
              `[GachaBanner Precreate] Banner ${banner.id} has no endDate, skipping`
            )
            continue
          }

          const triggerDate = addDaysUTC0000(
            banner.endDate,
            -banner.precreateBeforeEndDays
          )

          if (now < triggerDate) {
            this.logger.debug(
              `[GachaBanner Precreate] Banner ${banner.id} not yet ready (trigger: ${triggerDate.toISOString()})`
            )
            continue
          }

          // Kiểm tra xem đã tạo banner mới chưa (tránh tạo trùng)
          const newBannerNameKey = `${banner.nameKey}.next`
          const existingNext = await this.prismaService.gachaBanner.findFirst({
            where: {
              nameKey: {
                startsWith: newBannerNameKey
              },
              deletedAt: null
            }
          })

          if (existingNext) {
            this.logger.log(
              `[GachaBanner Precreate] Banner ${banner.id} already has next banner (${existingNext.id}), skipping`
            )
            continue
          }

          this.logger.log(`[GachaBanner Precreate] Creating next banner for ${banner.id}`)

          // 2. Tạo banner mới
          const newStartDate = banner.endDate
          const newEndDate = addDaysUTC0000(banner.endDate, 7)
          const timestamp = Date.now()

          // Tạo banner mới
          const newBanner = await this.prismaService.gachaBanner.create({
            data: {
              nameKey: `temp.${timestamp}`, // Tạm thời, sẽ update sau
              startDate: newStartDate,
              endDate: newEndDate,
              status: GachaBannerStatus.PREVIEW,
              hardPity5Star: banner.hardPity5Star,
              costRoll: banner.costRoll,
              enablePrecreate: banner.enablePrecreate,
              precreateBeforeEndDays: banner.precreateBeforeEndDays,
              isRandomItemAgain: banner.isRandomItemAgain,
              amount5Star: banner.amount5Star,
              amount4Star: banner.amount4Star,
              amount3Star: banner.amount3Star,
              amount2Star: banner.amount2Star,
              amount1Star: banner.amount1Star,
              createdById: banner.createdById
            }
          })

          // 3. Update nameKey và tạo translations cùng lúc
          const finalNameKeyWithId = `gachaBanner.name.${newBanner.id}`

          this.logger.log(
            `[GachaBanner Precreate] Old banner ${banner.id} has ${banner.nameTranslations.length} translations`
          )
          this.logger.debug(
            `[GachaBanner Precreate] Old banner translations: ${JSON.stringify(banner.nameTranslations)}`
          )

          const nameUpserts = banner.nameTranslations.map((t) => ({
            where: {
              languageId_key: { languageId: t.languageId, key: finalNameKeyWithId }
            },
            update: { value: t.value },
            create: {
              languageId: t.languageId,
              key: finalNameKeyWithId,
              value: t.value
            }
          }))

          this.logger.log(
            `[GachaBanner Precreate] Will upsert ${nameUpserts.length} translations`
          )

          await this.prismaService.gachaBanner.update({
            where: { id: newBanner.id },
            data: {
              nameKey: finalNameKeyWithId,
              ...(nameUpserts.length
                ? { nameTranslations: { upsert: nameUpserts as any } }
                : {})
            }
          })

          this.logger.log(
            `[GachaBanner Precreate] Translations upserted for banner ${newBanner.id}`
          )

          // 4. Tạo gacha items
          if (banner.isRandomItemAgain) {
            // Random items mới theo star type
            this.logger.log(
              `[GachaBanner Precreate] Randomizing items for banner ${newBanner.id}`
            )

            const randomItems: Array<{ starType: GachaStarType; typeIds: number[] }> = []

            // Tạo request cho mỗi star type có amount > 0
            if (banner.amount5Star > 0) {
              randomItems.push({
                starType: GachaStarType.FIVE,
                typeIds: []
              })
            }
            if (banner.amount4Star > 0) {
              randomItems.push({
                starType: GachaStarType.FOUR,
                typeIds: []
              })
            }
            if (banner.amount3Star > 0) {
              randomItems.push({
                starType: GachaStarType.THREE,
                typeIds: []
              })
            }
            if (banner.amount2Star > 0) {
              randomItems.push({
                starType: GachaStarType.TWO,
                typeIds: []
              })
            }
            if (banner.amount1Star > 0) {
              randomItems.push({
                starType: GachaStarType.ONE,
                typeIds: []
              })
            }

            const randomResult = await this.gachaItemService.getRandomListItem(
              {
                bannerId: newBanner.id,
                items: randomItems
              },
              'vi'
            )

            // Prepare items để tạo
            const itemsToCreate = randomResult.data.items.flatMap((item: any) =>
              item.pokemons.map((pokemon: any) => ({
                starType: item.starType,
                pokemons: [pokemon.id]
              }))
            )

            // Group by starType
            const groupedItems = itemsToCreate.reduce((acc: any, item: any) => {
              const existing = acc.find((x: any) => x.starType === item.starType)
              if (existing) {
                existing.pokemons.push(...item.pokemons)
              } else {
                acc.push({
                  starType: item.starType,
                  pokemons: item.pokemons
                })
              }
              return acc
            }, [])

            // Gọi createByList
            await this.gachaItemService.createByList(
              banner.createdById ?? 1,
              {
                bannerId: newBanner.id,
                items: groupedItems
              },
              'vi'
            )
          } else {
            // Copy items từ banner cũ
            this.logger.log(
              `[GachaBanner Precreate] Copying items from banner ${banner.id} to ${newBanner.id}`
            )

            // Group items by starType
            const itemsByStarType = banner.items.reduce((acc: any, item: any) => {
              const starType = item.gachaItemRate.starType
              if (!acc[starType]) {
                acc[starType] = []
              }
              acc[starType].push(item.pokemonId)
              return acc
            }, {})

            const itemsToCreate = Object.entries(itemsByStarType).map(
              ([starType, pokemonIds]) => ({
                starType: starType as GachaStarType,
                pokemons: pokemonIds as number[]
              })
            )

            await this.gachaItemService.createByList(
              banner.createdById ?? 1,
              {
                bannerId: newBanner.id,
                items: itemsToCreate
              },
              'vi'
            )
          }

          this.logger.log(
            `[GachaBanner Precreate] Successfully created banner ${newBanner.id} (${finalNameKeyWithId})`
          )

          // 5. Update banner cũ: disable precreate để không tạo lại nữa
          await this.prismaService.gachaBanner.update({
            where: { id: banner.id },
            data: {
              enablePrecreate: false,
              precreateBeforeEndDays: 999
            }
          })

          this.logger.log(
            `[GachaBanner Precreate] Disabled precreate for old banner ${banner.id}`
          )
        } catch (bannerError) {
          this.logger.error(
            `[GachaBanner Precreate] Error creating next banner for ${banner.id}:`,
            bannerError
          )
          // Continue với banner tiếp theo
        }
      }

      this.logger.log('[GachaBanner Precreate] Completed')
    } catch (error) {
      this.logger.error('[GachaBanner Precreate] Error:', error)
      throw error
    }
  }
}
