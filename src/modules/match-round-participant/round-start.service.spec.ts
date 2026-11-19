import { RoundStartService } from './round-start.service'

// Rules approved in the phase 6 diff table (service-extraction-plan section 7):
// questions once per round (2.1), the debuffed player (2.3, 2.4), extra
// ADD_QUESTION questions give no points (2.5), live next-round pickers (2.6).
const setUp = () => {
  const repo = {
    findLiveInRoundWithPicks: jest.fn(),
    findMatchParticipants: jest.fn().mockResolvedValue([{ userId: 1 }, { userId: 2 }]),
    setQuestionsTotal: jest.fn(),
    assignDebuff: jest.fn(),
    addQuestionsTotal: jest.fn(),
    findMany: jest.fn(),
    setPickDeadline: jest.fn()
  }
  const matchRounds = {
    setRoundPending: jest.fn(),
    findByMatchIdAndRoundNumber: jest.fn()
  }
  const users = {
    findElos: jest.fn().mockResolvedValue([
      { id: 1, eloscore: 0 },
      { id: 2, eloscore: 0 }
    ])
  }
  const questionBank = {
    getRandomQuestions: jest.fn(async (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: 100 + i }))
    )
  }
  const roundQuestions = {
    countForParticipants: jest.fn().mockResolvedValue(0),
    createQuestionRow: jest.fn(),
    findQuestionsOfParticipant: jest.fn().mockResolvedValue([{ id: 7, basePoints: 100 }]),
    setDebuffAndPoints: jest.fn(),
    setDebuff: jest.fn()
  }
  const debuffs = { findLiveDebuffs: jest.fn().mockResolvedValue([]) }
  const pokemon = { calculateDebuffedPokemon: jest.fn() }
  const queue = { add: jest.fn() }
  const service = new RoundStartService(
    repo as never,
    matchRounds as never,
    users as never,
    questionBank as never,
    roundQuestions as never,
    debuffs as never,
    pokemon as never,
    queue as never
  )
  const players = (pokemon1: number | null, pokemon2: number | null) =>
    repo.findLiveInRoundWithPicks.mockResolvedValue([
      { id: 11, selectedUserPokemon: pokemon1 ? { pokemonId: pokemon1 } : null },
      { id: 12, selectedUserPokemon: pokemon2 ? { pokemonId: pokemon2 } : null }
    ])
  return { service, repo, matchRounds, roundQuestions, debuffs, pokemon, queue, players }
}

describe('RoundStartService.generateQuestionsAndDebuff', () => {
  it('both players get the same questions; a round that has them is left alone', async () => {
    const { service, roundQuestions, players } = setUp()
    players(3, 4)
    await expect(service.generateQuestionsAndDebuff(5, 9)).resolves.toBe(true)
    const rows = roundQuestions.createQuestionRow.mock.calls.map(([r]) => r)
    expect(rows).toHaveLength(10)
    expect(
      rows.filter((r) => r.matchRoundParticipantId === 11).map((r) => r.questionBankId)
    ).toEqual(
      rows.filter((r) => r.matchRoundParticipantId === 12).map((r) => r.questionBankId)
    )

    roundQuestions.createQuestionRow.mockClear()
    roundQuestions.countForParticipants.mockResolvedValue(10)
    await expect(service.generateQuestionsAndDebuff(5, 9)).resolves.toBe(true)
    expect(roundQuestions.createQuestionRow).not.toHaveBeenCalled()
  })

  it('ADD_QUESTION: extra questions for the debuffed player, worth 0 points', async () => {
    const { service, repo, roundQuestions, debuffs, pokemon, players } = setUp()
    players(3, 4)
    debuffs.findLiveDebuffs.mockResolvedValue([
      { id: 2, typeDebuff: 'ADD_QUESTION', valueDebuff: 2 }
    ])
    pokemon.calculateDebuffedPokemon.mockResolvedValue({ debuffedPokemonId: 4 })
    await service.generateQuestionsAndDebuff(5, 9)
    const extra = roundQuestions.createQuestionRow.mock.calls
      .map(([r]) => r)
      .filter((r) => r.debuffId === 2)
    expect(extra).toHaveLength(2)
    expect(
      extra.every((r) => r.matchRoundParticipantId === 12 && r.basePoints === 0)
    ).toBe(true)
    expect(repo.assignDebuff).toHaveBeenCalledWith(12, 2, 5)
    expect(repo.addQuestionsTotal).toHaveBeenCalledWith(12, 2)
  })

  it('the matchup cannot be computed: the lower pokemonId is debuffed', async () => {
    const { service, repo, debuffs, pokemon, players } = setUp()
    players(8, 4)
    debuffs.findLiveDebuffs.mockResolvedValue([
      { id: 3, typeDebuff: 'DISCOMFORT_VISION' }
    ])
    pokemon.calculateDebuffedPokemon.mockRejectedValue(new Error('no types'))
    await service.generateQuestionsAndDebuff(5, 9)
    expect(repo.assignDebuff).toHaveBeenCalledWith(12, 3, 5)
  })

  it('a player without a Pokemon: no debuff', async () => {
    const { service, repo, debuffs, players } = setUp()
    players(3, null)
    debuffs.findLiveDebuffs.mockResolvedValue([
      { id: 3, typeDebuff: 'DISCOMFORT_VISION' }
    ])
    await service.generateQuestionsAndDebuff(5, 9)
    expect(repo.assignDebuff).not.toHaveBeenCalled()
  })

  it('a failure while generating gives false (the pick path stops there)', async () => {
    const { service, roundQuestions, players } = setUp()
    players(3, 4)
    roundQuestions.createQuestionRow.mockRejectedValue(new Error('db down'))
    await expect(service.generateQuestionsAndDebuff(5, 9)).resolves.toBe(false)
  })
})

describe('RoundStartService.moveToNextRound', () => {
  it('the next round first live picker gets the pick timer', async () => {
    const { service, repo, matchRounds, queue } = setUp()
    matchRounds.findByMatchIdAndRoundNumber.mockResolvedValue({ id: 31 })
    repo.findMany.mockResolvedValue([{ id: 41 }])
    await service.moveToNextRound({ id: 30, matchId: 9, roundNumber: 'ONE' })
    expect(matchRounds.setRoundPending).toHaveBeenCalledWith(30)
    expect(repo.findMany).toHaveBeenCalledWith({
      where: { matchRoundId: 31, deletedAt: null },
      orderBy: { orderSelected: 'asc' }
    })
    expect(repo.setPickDeadline).toHaveBeenCalledWith(41, expect.any(Date))
    expect(queue.add).toHaveBeenCalledWith(
      'check-pokemon-selection-timeout',
      { matchRoundParticipantId: 41 },
      { delay: 5000 }
    )
  })

  it('after round three nothing is scheduled', async () => {
    const { service, matchRounds, queue } = setUp()
    await service.moveToNextRound({ id: 30, matchId: 9, roundNumber: 'THREE' })
    expect(matchRounds.findByMatchIdAndRoundNumber).not.toHaveBeenCalled()
    expect(queue.add).not.toHaveBeenCalled()
  })
})
