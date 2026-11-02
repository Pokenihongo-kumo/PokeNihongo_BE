import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

type IntrospectField = {
  name: string
}

type IntrospectModel = {
  name: string
  fields: IntrospectField[]
}

@Injectable()
export class SchemaIntrospectService {
  private readonly modelBlacklist = new Set<string>([
    'User',
    'RefreshToken',
    'Device',
    'Permission',
    'Role',
    'Wallet',
    'WalletTransaction'
  ])

  private readonly fieldBlacklist = new Set<string>([
    'password',
    'email',
    'phoneNumber',
    'token'
  ])

  listModels(): IntrospectModel[] {
    const models = Prisma.dmmf.datamodel.models || []
    return models
      .filter((m) => !this.modelBlacklist.has(m.name))
      .map((m) => ({
        name: m.name,
        fields: m.fields
          .filter((f) => !this.fieldBlacklist.has(f.name))
          .map((f) => ({ name: f.name }))
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}
