import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateWalletBodySchema,
  CreateWalletResSchema,
  GetWalletDetailResSchema,
  GetWalletParamsSchema,
  GetWalletsWithUserResSchema,
  UpdateWalletBodySchema,
  UpdateWalletResSchema
} from './wallet.zod-dto'

export type CreatedWalletBody = z.infer<typeof CreateWalletBodySchema>

export class CreatedWalletBodyDTO extends createZodDto(CreateWalletBodySchema) {}

export type CreateWalletRes = z.infer<typeof CreateWalletResSchema>

export class CreateWalletResDTO extends createZodDto(CreateWalletResSchema) {}

export type UpdateWalletBody = z.infer<typeof UpdateWalletBodySchema>

export class UpdateWalletBodyDTO extends createZodDto(UpdateWalletBodySchema) {}

export type UpdateWalletRes = z.infer<typeof UpdateWalletResSchema>

export class UpdateWalletResDTO extends createZodDto(UpdateWalletResSchema) {}

export type GetWalletParams = z.infer<typeof GetWalletParamsSchema>

export class GetWalletParamsDTO extends createZodDto(GetWalletParamsSchema) {}

export type GetWalletDetailRes = z.infer<typeof GetWalletDetailResSchema>

export class GetWalletDetailResDTO extends createZodDto(GetWalletDetailResSchema) {}

export type GetWalletsWithUserRes = z.infer<typeof GetWalletsWithUserResSchema>

export class GetWalletsWithUserResDTO extends createZodDto(GetWalletsWithUserResSchema) {}
