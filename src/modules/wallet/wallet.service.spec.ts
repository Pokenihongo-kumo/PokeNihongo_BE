import { WalletService, WalletMovement } from './wallet.service'

// debit/credit: the balance change and its wallet-transaction row go together
describe('WalletService debit/credit', () => {
  const tx = { tag: 'caller-tx' } as any
  const ownTx = { tag: 'own-tx' } as any
  const wallet = { id: 7, balance: 50 }
  const movement: WalletMovement = {
    userId: 3,
    type: 'SPARKLES',
    amount: 20,
    createdById: 9,
    purpose: 'SHOP',
    referenceId: 11,
    source: 'SHOP_PURCHASE',
    description: 'Shop purchase 11'
  }

  let repo: Record<string, jest.Mock>
  let transactions: { record: jest.Mock }
  let service: WalletService

  beforeEach(() => {
    repo = {
      minusBalanceToWalletWithTypeUserId: jest.fn().mockResolvedValue(wallet),
      addBalanceToWalletWithType: jest.fn().mockResolvedValue(wallet),
      creditOrCreate: jest.fn().mockResolvedValue(wallet),
      withTransaction: jest.fn((work) => work(ownTx))
    }
    transactions = { record: jest.fn().mockResolvedValue({ id: 99 }) }
    service = new WalletService(repo as any, {} as any, transactions as any)
  })

  const recorded = (type: string, client: unknown) => [
    {
      createdById: 9,
      data: {
        walletId: 7,
        userId: 3,
        purpose: 'SHOP',
        referenceId: 11,
        amount: 20,
        type,
        source: 'SHOP_PURCHASE',
        description: 'Shop purchase 11'
      }
    },
    client
  ]

  it('debit takes the amount and records a DECREASE in the caller transaction', async () => {
    await expect(service.debit(movement, tx)).resolves.toEqual({
      wallet,
      transaction: { id: 99 }
    })
    expect(repo.minusBalanceToWalletWithTypeUserId).toHaveBeenCalledWith(
      { userId: 3, type: 'SPARKLES', amount: 20 },
      tx
    )
    expect(transactions.record).toHaveBeenCalledWith(...recorded('DECREASE', tx))
    expect(repo.withTransaction).not.toHaveBeenCalled()
  })

  it('debit returns null and records nothing when the balance does not cover it', async () => {
    repo.minusBalanceToWalletWithTypeUserId.mockResolvedValue(null)
    await expect(service.debit(movement, tx)).resolves.toBeNull()
    expect(transactions.record).not.toHaveBeenCalled()
  })

  it('credit opens its own transaction when the caller has none', async () => {
    await service.credit(movement)
    expect(repo.withTransaction).toHaveBeenCalledTimes(1)
    expect(repo.addBalanceToWalletWithType).toHaveBeenCalledWith(
      { userId: 3, type: 'SPARKLES', amount: 20 },
      ownTx
    )
    expect(transactions.record).toHaveBeenCalledWith(...recorded('INCREASE', ownTx))
  })

  it('credit returns null without a wallet, unless createIfMissing', async () => {
    repo.addBalanceToWalletWithType.mockResolvedValue(null)
    await expect(service.credit(movement, tx)).resolves.toBeNull()
    expect(transactions.record).not.toHaveBeenCalled()

    await service.credit(movement, tx, { createIfMissing: true })
    expect(repo.creditOrCreate).toHaveBeenCalledWith(
      { userId: 3, type: 'SPARKLES', amount: 20 },
      tx
    )
    expect(transactions.record).toHaveBeenCalledWith(...recorded('INCREASE', tx))
  })

  it('defaults referenceId and description to null', async () => {
    await service.credit(
      {
        userId: 3,
        type: 'SPARKLES',
        amount: 20,
        purpose: 'REWARD',
        source: 'ADMIN_ADJUST'
      },
      tx
    )
    expect(transactions.record.mock.calls[0][0].data).toMatchObject({
      referenceId: null,
      description: null
    })
  })
})
