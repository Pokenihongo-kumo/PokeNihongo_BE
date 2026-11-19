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

export class CreatedWalletBodyDTO extends createZodDto(CreateWalletBodySchema) {}

export class CreateWalletResDTO extends createZodDto(CreateWalletResSchema) {}

export class UpdateWalletBodyDTO extends createZodDto(UpdateWalletBodySchema) {}

export class UpdateWalletResDTO extends createZodDto(UpdateWalletResSchema) {}

export class GetWalletParamsDTO extends createZodDto(GetWalletParamsSchema) {}

export class GetWalletDetailResDTO extends createZodDto(GetWalletDetailResSchema) {}

export class GetWalletsWithUserResDTO extends createZodDto(GetWalletsWithUserResSchema) {}
