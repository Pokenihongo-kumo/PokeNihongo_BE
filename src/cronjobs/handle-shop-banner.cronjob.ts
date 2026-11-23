import { ShopBannerStatus } from '@/common/constants/shop-banner.constant'
import { addDaysUTC0000, todayUTCWith0000 } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { LanguagesService } from '@/modules/languages/languages.service'
import { ShopItemService } from '@/modules/shop-item/shop-item.service'
import { ShopBannerService } from '@/modules/shop-banner/shop-banner.service'

@Injectable()
export class HandleShopBannerCronjob {
  private readonly logger = new Logger(HandleShopBannerCronjob.name)
  constructor(
    private shopBannerService: ShopBannerService,
    private shopItemService: ShopItemService,
    private languagesService: LanguagesService
  ) {}

  // Chạy mỗi ngày lúc 00:00
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleShopBannerStatus() {
    const now = todayUTCWith0000()
    this.logger.log(`[ShopBanner Cronjob Status] Running at ${now.toISOString()}`)

    try {
      // 1. Chuyển các banner ACTIVE có endDate < today sang EXPIRED
      const expiredResult = await this.shopBannerService.expireActiveEndedBefore(now)
      this.logger.log(
        `[ShopBanner Cronjob] Expired ${expiredResult.count} ACTIVE banners`
      )

      // 2. Lấy danh sách banner có status PREVIEW, hợp lệ về thời gian
      // Điều kiện: startDate <= today AND endDate >= today
      const previewBanners = await this.shopBannerService.findPreviewValidOn(now)

      // 3. Nếu có ít nhất 1 banner PREVIEW hợp lệ, chỉ activate khi KHÔNG có banner ACTIVE nào
      if (previewBanners.length > 0) {
        const activeCount = await this.shopBannerService.countActive()

        if (activeCount > 0) {
          this.logger.log(
            `[ShopBanner Cronjob] Skipped activation: there is already an ACTIVE banner (count=${activeCount})`
          )
        } else {
          const bannerToActivate = previewBanners[0]
          await this.shopBannerService.activate(bannerToActivate.id)
          this.logger.log(
            `[ShopBanner Cronjob] Activated PREVIEW banner: ID=${bannerToActivate.id}, nameKey=${bannerToActivate.nameKey}`
          )
        }
      } else {
        this.logger.log('[ShopBanner Cronjob] No eligible PREVIEW banner to activate')
      }

      this.logger.log('[ShopBanner Cronjob] Completed successfully')
    } catch (error) {
      this.logger.error('[ShopBanner Cronjob] Error:', error)
      throw error
    }
  }

  // // Chạy mỗi ngày lúc 01:00 để tự động tạo banner mới
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handlePrecreateShopBanner() {
    const now = todayUTCWith0000()
    this.logger.log(`[ShopBanner Precreate] Running at ${now.toISOString()}`)

    try {
      // 1. Tìm các banner ACTIVE có enablePrecreate = true
      //    và endDate - precreateBeforeEndDays <= now (đã đến thời điểm cần tạo banner mới)
      const activeBanners = await this.shopBannerService.findActiveWithPrecreate()

      for (const banner of activeBanners) {
        try {
          // Kiểm tra xem đã đến thời điểm cần tạo banner mới chưa
          if (!banner.endDate) {
            this.logger.warn(
              `[ShopBanner Precreate] Banner ${banner.id} has no endDate, skipping`
            )
            continue
          }

          const triggerDate = addDaysUTC0000(
            banner.endDate,
            -banner.precreateBeforeEndDays
          )

          if (now < triggerDate) {
            this.logger.debug(
              `[ShopBanner Precreate] Banner ${banner.id} not yet ready (trigger: ${triggerDate.toISOString()})`
            )
            continue
          }

          // Kiểm tra xem đã tạo banner mới chưa (tránh tạo trùng)
          const newBannerNameKey = `${banner.nameKey}.next`
          const existingNext =
            await this.shopBannerService.findLiveByNameKeyPrefix(newBannerNameKey)

          if (existingNext) {
            this.logger.log(
              `[ShopBanner Precreate] Banner ${banner.id} already has next banner (${existingNext.id}), skipping`
            )
            continue
          }

          this.logger.log(`[ShopBanner Precreate] Creating next banner for ${banner.id}`)

          // 2. Tạo banner mới
          const newStartDate = banner.endDate
          const newEndDate = addDaysUTC0000(banner.endDate, 7)
          const timestamp = Date.now()
          const finalNameKey = `shopBanner.name.${timestamp}`

          // Tạo banner mới
          const newBanner = await this.shopBannerService.createSuccessor({
            nameKey: `temp.${timestamp}`, // Tạm thời, sẽ update sau
            startDate: newStartDate,
            endDate: newEndDate,
            status: ShopBannerStatus.PREVIEW,
            min: banner.min,
            max: banner.max,
            enablePrecreate: banner.enablePrecreate,
            precreateBeforeEndDays: banner.precreateBeforeEndDays,
            isRandomItemAgain: banner.isRandomItemAgain,
            createdById: banner.createdById
          })

          // 3. Update nameKey và tạo translations cùng lúc (giống ShopBannerService)
          const finalNameKeyWithId = `shopBanner.name.${newBanner.id}`

          this.logger.log(
            `[ShopBanner Precreate] Old banner ${banner.id} has ${banner.nameTranslations.length} translations`
          )
          this.logger.debug(
            `[ShopBanner Precreate] Old banner translations: ${JSON.stringify(banner.nameTranslations)}`
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
            `[ShopBanner Precreate] Will upsert ${nameUpserts.length} translations`
          )

          await this.shopBannerService.setNameKeyAndTranslations(
            newBanner.id,
            finalNameKeyWithId,
            nameUpserts
          )

          this.logger.log(
            `[ShopBanner Precreate] Translations upserted for banner ${newBanner.id}`
          )

          // 5. Tạo shop items
          if (banner.isRandomItemAgain) {
            // Random items mới
            this.logger.log(
              `[ShopBanner Precreate] Randomizing items for banner ${newBanner.id}`
            )

            const randomResult = await this.shopItemService.getRandomListItem({
              shopBannerId: newBanner.id,
              amount: banner.max
            })

            // Filter bỏ thuộc tính pokemon và isHas (không có trong schema)
            const itemsToCreate = randomResult.map((item: any) => {
              const { pokemon, isHas, ...rest } = item
              return rest
            })

            // Gọi createByList
            await this.shopItemService.createByList({
              userId: banner.createdById ?? 1,
              data: { items: itemsToCreate }
            })
          } else {
            // Copy items từ banner cũ
            this.logger.log(
              `[ShopBanner Precreate] Copying items from banner ${banner.id} to ${newBanner.id}`
            )

            const itemsToCreate = banner.shopItems.map((item) => ({
              shopBannerId: newBanner.id,
              pokemonId: item.pokemonId,
              price: item.price,
              purchaseLimit: item.purchaseLimit,
              isActive: item.isActive
            }))

            await this.shopItemService.createByList({
              userId: banner.createdById ?? 1,
              data: { items: itemsToCreate }
            })
          }

          this.logger.log(
            `[ShopBanner Precreate] Successfully created banner ${newBanner.id} (${finalNameKeyWithId})`
          )

          // 6. Update banner cũ: disable precreate để không tạo lại nữa
          await this.shopBannerService.disablePrecreate(banner.id)

          this.logger.log(
            `[ShopBanner Precreate] Disabled precreate for old banner ${banner.id}`
          )
        } catch (bannerError) {
          this.logger.error(
            `[ShopBanner Precreate] Error creating next banner for ${banner.id}:`,
            bannerError
          )
          // Continue với banner tiếp theo
        }
      }

      this.logger.log('[ShopBanner Precreate] Completed')
    } catch (error) {
      this.logger.error('[ShopBanner Precreate] Error:', error)
      throw error
    }
  }
}
