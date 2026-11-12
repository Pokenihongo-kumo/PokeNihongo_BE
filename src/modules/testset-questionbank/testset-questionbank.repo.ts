import { TestSetQuestionBankType } from './entities/testset-questionbank.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

@Injectable()
export class TestSetQuestionBankRepo {
  constructor(private readonly prismaService: PrismaService) {}

  create(
    data: Prisma.TestSetQuestionBankUncheckedCreateInput
  ): Promise<TestSetQuestionBankType> {
    return this.prismaService.testSetQuestionBank.create({ data })
  }

  findById(id: number): Promise<TestSetQuestionBankType | null> {
    return this.prismaService.testSetQuestionBank.findUnique({ where: { id } })
  }

  findByTestSetId(testSetId: number): Promise<TestSetQuestionBankType[]> {
    return this.prismaService.testSetQuestionBank.findMany({
      where: { testSetId },
      orderBy: { questionOrder: 'asc' }
    })
  }

  findByTestSetAndQuestionBank(
    testSetId: number,
    questionBankId: number
  ): Promise<TestSetQuestionBankType | null> {
    return this.prismaService.testSetQuestionBank.findUnique({
      where: { testSetId_questionBankId: { testSetId, questionBankId } }
    })
  }

  // Only the fields the type and level rules need
  findTestSet(id: number) {
    return this.prismaService.testSet.findUnique({
      where: { id },
      select: { id: true, testType: true, levelN: true }
    })
  }

  findQuestionBank(id: number) {
    return this.prismaService.questionBank.findUnique({
      where: { id },
      select: { id: true, questionType: true, levelN: true }
    })
  }

  update(
    id: number,
    data: Prisma.TestSetQuestionBankUncheckedUpdateInput
  ): Promise<TestSetQuestionBankType> {
    return this.prismaService.testSetQuestionBank.update({ where: { id }, data })
  }

  delete(id: number): Promise<TestSetQuestionBankType> {
    return this.prismaService.testSetQuestionBank.delete({ where: { id } })
  }

  deleteMany(ids: number[]): Promise<{ count: number }> {
    return this.prismaService.testSetQuestionBank.deleteMany({
      where: { id: { in: ids } }
    })
  }

  deleteByTestSetId(testSetId: number): Promise<{ count: number }> {
    return this.prismaService.testSetQuestionBank.deleteMany({ where: { testSetId } })
  }

  // 0 for an empty test set. Not count(): after a delete it would reuse an order
  async maxQuestionOrder(testSetId: number): Promise<number> {
    const { _max } = await this.prismaService.testSetQuestionBank.aggregate({
      where: { testSetId },
      _max: { questionOrder: true }
    })
    return _max.questionOrder ?? 0
  }
}
