import { MatchingSocketMessage } from '@/i18n/message-keys'
import { HttpException, HttpStatus } from '@nestjs/common'
import { MatchRoundParticipantService } from './match-round-participant.service'

// Only the dependencies touched by the path under test are faked.
function createService() {
  const matchRoundParticipantRepo = { findByMatchRoundIdAndUserId: jest.fn() }
  const matchRoundRepo = { findByIdWithMatchAndParticipants: jest.fn() }
  const matchingGateway = { notifyPokemonSelectionExpired: jest.fn() }
  const i18nService = { translate: jest.fn((key: string) => key) }
  const service = new MatchRoundParticipantService(
    matchRoundParticipantRepo as any,
    matchRoundRepo as any,
    {} as any,
    {} as any,
    {} as any,
    i18nService as any,
    {} as any,
    matchingGateway as any,
    {} as any
  )
  return { service, matchRoundParticipantRepo, matchRoundRepo, matchingGateway }
}

describe('MatchRoundParticipantService', () => {
  describe('choosePokemonWithRound', () => {
    it('throws 400 (not a 2xx body) when the Pokemon was already auto-selected on timeout', async () => {
      const { service, matchRoundParticipantRepo, matchRoundRepo, matchingGateway } =
        createService()
      matchRoundRepo.findByIdWithMatchAndParticipants.mockResolvedValue({
        id: 11,
        match: { id: 5, participants: [{ userId: 7 }] }
      })
      matchRoundParticipantRepo.findByMatchRoundIdAndUserId.mockResolvedValue({
        id: 21,
        selectedUserPokemonId: 99
      })

      const error = await service
        .choosePokemonWithRound({
          matchRoundId: 11,
          userId: 7,
          data: { pokemonId: 1 } as any
        })
        .then(
          () => undefined,
          (e: unknown) => e
        )

      expect(error).toBeInstanceOf(HttpException)
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST)
      expect((error as HttpException).getResponse()).toMatchObject({
        errorKey: MatchingSocketMessage.TIMOUT_SELECTED_POKEMON
      })
      // The socket notification is still sent, as before
      expect(matchingGateway.notifyPokemonSelectionExpired).toHaveBeenCalledWith(
        5,
        11,
        7,
        MatchingSocketMessage.TIMOUT_SELECTED_POKEMON
      )
    })
  })
})
