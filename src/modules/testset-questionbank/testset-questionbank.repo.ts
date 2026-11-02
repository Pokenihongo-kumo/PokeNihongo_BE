import {
  TestSetQuestionBankType,
  CreateTestSetQuestionBankBodyType,
  UpdateTestSetQuestionBankBodyType
} from './entities/testset-questionbank.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class TestSetQuestionBankRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // TestSetQuestionBank CRUD operations
  async create(
    data: CreateTestSetQuestionBankBodyType
  ): Promise<TestSetQuestionBankType> {
    return await this.prismaService.testSetQuestionBank.create({
      data
    })
  }

  async findById(id: number): Promise<TestSetQuestionBankType | null> {
    return await this.prismaService.testSetQuestionBank.findUnique({
      where: { id }
    })
  }

  async findByTestSetId(testSetId: number): Promise<TestSetQuestionBankType[]> {
    return await this.prismaService.testSetQuestionBank.findMany({
      where: { testSetId },
      orderBy: { questionOrder: 'asc' }
    })
  }

  async findByQuestionBankId(questionBankId: number): Promise<TestSetQuestionBankType[]> {
    return await this.prismaService.testSetQuestionBank.findMany({
      where: { questionBankId }
    })
  }

  async findByTestSetAndQuestionBank(
    testSetId: number,
    questionBankId: number
  ): Promise<TestSetQuestionBankType | null> {
    return await this.prismaService.testSetQuestionBank.findFirst({
      where: {
        testSetId,
        questionBankId
      }
    })
  }

  async update(
    id: number,
    data: UpdateTestSetQuestionBankBodyType
  ): Promise<TestSetQuestionBankType> {
    return await this.prismaService.testSetQuestionBank.update({
      where: { id },
      data
    })
  }

  async updateQuestionOrder(
    id: number,
    questionOrder: number
  ): Promise<TestSetQuestionBankType> {
    return await this.prismaService.testSetQuestionBank.update({
      where: { id },
      data: { questionOrder }
    })
  }

  async delete(id: number): Promise<TestSetQuestionBankType> {
    return await this.prismaService.testSetQuestionBank.delete({
      where: { id }
    })
  }

  async deleteMany(ids: number[]): Promise<{ count: number }> {
    return await this.prismaService.testSetQuestionBank.deleteMany({
      where: { id: { in: ids } }
    })
  }

  async deleteByTestSetId(testSetId: number): Promise<{ count: number }> {
    return await this.prismaService.testSetQuestionBank.deleteMany({
      where: { testSetId }
    })
  }

  async deleteByQuestionBankId(questionBankId: number): Promise<{ count: number }> {
    return await this.prismaService.testSetQuestionBank.deleteMany({
      where: { questionBankId }
    })
  }

  async countByTestSetId(testSetId: number): Promise<number> {
    return await this.prismaService.testSetQuestionBank.count({
      where: { testSetId }
    })
  }

  async countByQuestionBankId(questionBankId: number): Promise<number> {
    return await this.prismaService.testSetQuestionBank.count({
      where: { questionBankId }
    })
  }
}
