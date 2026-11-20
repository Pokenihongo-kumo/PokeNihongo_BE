import { UserRewardSourceType } from '@prisma/client'
import { RewardService } from './reward.service'

// convertRewardsWithUser across every reward type in one call: EXP that
// levels the user up (the level reward is queued and granted too), POKE_COINS
// and SPARKLES with the subscription multipliers, a new Pokemon and a
// duplicate one turned into SPARKLES. The snapshot pins every outside call
// (wallet credits, EXP, history rows, notifications, socket pushes) and the
// result; phase 6 X6 split the method by reward type and this spec ran on
// the code before and after the split with the same snapshot.
describe('RewardService.convertRewardsWithUser', () => {
  const rows = [
    { id: 1, rewardTarget: 'EXP', rewardItem: 50 },
    { id: 2, rewardTarget: 'POKE_COINS', rewardItem: 10 },
    { id: 3, rewardTarget: 'SPARKLES', rewardItem: 5 },
    { id: 4, rewardTarget: 'POKEMON', rewardItem: 25 }, // the user has it
    { id: 5, rewardTarget: 'POKEMON', rewardItem: 30 }, // new
    { id: 6, rewardTarget: 'SPARKLES', rewardItem: 7 } // the level-up reward
  ]
  const rewardRepo = {
    findManyByIds: jest.fn(async (ids: number[]) =>
      rows.filter((r) => ids.includes(r.id))
    )
  }
  const userService = {
    userAddExp: jest.fn().mockResolvedValue({
      levelsGained: 1,
      levelRewardIds: [6],
      levelUpDetails: [{ fromLevel: 1, toLevel: 2 }]
    })
  }
  const walletService = {
    credit: jest.fn(async (m: { type: string; amount: number }) => ({
      wallet: { type: m.type, balance: m.amount }
    }))
  }
  const pokemonService = {
    getById: jest.fn(async (id: number) => ({ id, nameJp: `P${id}`, rarity: 'RARE' }))
  }
  const userPokemonService = {
    findByUserAndPokemon: jest.fn(async (_u: number, pid: number) =>
      pid === 25 ? { id: 1 } : null
    ),
    insert: jest.fn(async ({ data }: { data: { pokemonId: number } }) => ({
      id: 99,
      pokemonId: data.pokemonId
    }))
  }
  const history = {
    appendEntriesFromRewards: jest.fn(
      (
        entries: unknown[],
        rewards: { id: number; rewardItem: number }[],
        userId,
        target,
        sourceType,
        multiplier,
        sourceId
      ) => {
        for (const r of rewards)
          entries.push({
            userId,
            rewardId: r.id,
            target,
            amount: r.rewardItem * multiplier,
            sourceType,
            sourceId
          })
      }
    ),
    createEntryPayload: jest.fn((p: unknown) => p),
    create: jest.fn()
  }
  const userSub = {
    getValueConvertByfeatureKeyAndUserId: jest.fn(async (key: string) =>
      key === 'COIN_MULTIPLIER' ? 2 : 3
    )
  }
  let nextId = 100
  const notifications = {
    create: jest.fn(async ({ data }: { data: { type: string; data: unknown } }) => ({
      id: nextId++,
      type: data.type,
      data: data.data
    })),
    sendNotiToUserBySocket: jest.fn()
  }
  const service = new RewardService(
    rewardRepo as never,
    {} as never,
    {} as never,
    userService as never,
    walletService as never,
    pokemonService as never,
    userPokemonService as never,
    history as never,
    userSub as never,
    notifications as never
  )

  it('grants each type, queues the level reward, records and notifies', async () => {
    const result = await service.convertRewardsWithUser(
      [1, 2, 3, 4, 5],
      7,
      UserRewardSourceType.EXERCISE,
      undefined,
      42
    )
    const socket = notifications.sendNotiToUserBySocket.mock.calls.map(([arg]) => ({
      ...arg,
      payload: { ...arg.payload, timestamp: 'date' }
    }))
    expect({
      result,
      userAddExp: userService.userAddExp.mock.calls,
      credits: walletService.credit.mock.calls.map(([m]) => m),
      pokemonInserts: userPokemonService.insert.mock.calls.map(([a]) => a),
      history: history.create.mock.calls.map(([e]) => e),
      notifications: notifications.create.mock.calls.map(([a]) => a),
      socket
    }).toMatchSnapshot()
  })

  it('a reduced reward (exercise done before) multiplies by 0.1', async () => {
    walletService.credit.mockClear()
    await service.convertRewardsWithUser([2], 7, UserRewardSourceType.EXERCISE, {
      reduceReward: true
    })
    expect(walletService.credit.mock.calls[0][0]).toMatchObject({
      type: 'POKE_COINS',
      amount: 10 * 2 * 0.1
    })
  })

  it('a missing reward id is a 404 and nothing is granted', async () => {
    walletService.credit.mockClear()
    await expect(
      service.convertRewardsWithUser([2, 999], 7, UserRewardSourceType.EXERCISE)
    ).rejects.toMatchObject({ status: 404 })
    expect(walletService.credit).not.toHaveBeenCalled()
  })
})
