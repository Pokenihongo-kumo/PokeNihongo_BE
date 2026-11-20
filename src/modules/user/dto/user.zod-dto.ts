import { checkIdSchema } from '@/common/utils/id.validation'
import { UserMessage, ValidationMessage } from '@/i18n/message-keys'
import { UserSchema } from '@/shared/models/shared-user.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { UserWithoutPasswordSchema } from '../entities/user.entity'

export const CreateUserBodySchema = UserSchema.pick({
  email: true,
  name: true,
  roleId: true,
  phoneNumber: true,
  avatar: true
})
  .extend({
    avatar: z.string().url().optional()
  })
  .strict()

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>

export class CreateUserBodyDTO extends createZodDto(CreateUserBodySchema) {}

export const CreateUserResSchema = resSchema(UserSchema.omit({ password: true }))

export class CreateUserResDTO extends createZodDto(CreateUserResSchema) {}

export const UpdateUserBodySchema = UserSchema.pick({
  name: true,
  phoneNumber: true,
  avatar: true,
  status: true,
  roleId: true,
  levelId: true,
  password: true,
  exp: true
})
  .partial()
  .strict()

export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>

export class UpdateUserBodyDTO extends createZodDto(UpdateUserBodySchema) {}

export const UpdateUserResSchema = CreateUserResSchema

export class UpdateUserResDTO extends createZodDto(UpdateUserResSchema) {}

export const GetUserParamsSchema = z
  .object({
    userId: checkIdSchema(ValidationMessage.INVALID_USER_ID)
  })
  .strict()

export class GetUserParamsDTO extends createZodDto(GetUserParamsSchema) {}

export const GetUserDetailResSchema = resSchema(UserWithoutPasswordSchema)

export class GetUserDetailResDTO extends createZodDto(GetUserDetailResSchema) {}

export const SetMainPokemonBodySchema = z
  .object({
    pokemonId: z
      .number()
      .int(UserMessage.INVALID_POKEMON_ID)
      .min(1, UserMessage.INVALID_POKEMON_ID)
  })
  .strict()

export type SetMainPokemonBody = z.infer<typeof SetMainPokemonBodySchema>

export class SetMainPokemonBodyDTO extends createZodDto(SetMainPokemonBodySchema) {}
