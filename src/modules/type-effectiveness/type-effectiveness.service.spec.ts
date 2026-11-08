import { UpdateTypeEffectivenessBodySchema } from './entities/type-effectiveness.entity'
import { TypeEffectivenessService } from './type-effectiveness.service'

describe('TypeEffectiveness', () => {
  describe('update body', () => {
    it('accepts a body with only the multiplier', () => {
      expect(
        UpdateTypeEffectivenessBodySchema.safeParse({ multiplier: 0.5 }).success
      ).toBe(true)
    })

    it('still rejects the same attacker and defender when both are sent', () => {
      expect(
        UpdateTypeEffectivenessBodySchema.safeParse({ attackerId: 3, defenderId: 3 })
          .success
      ).toBe(false)
    })
  })

  describe('calculateMultiTypeEffectiveness', () => {
    const repo = { getEffectivenessMatrix: jest.fn(), findActiveTypeNames: jest.fn() }
    const service = new TypeEffectivenessService(
      repo as never,
      { translate: (k: string) => k } as never
    )

    it('multiplies the multiplier of every defender type, repeats included', async () => {
      repo.getEffectivenessMatrix.mockResolvedValue({
        water: { fire: 2, grass: 0.5 },
        ghost: { normal: 0 }
      })
      repo.findActiveTypeNames.mockResolvedValue(['fire', 'fire'])

      const { data } = await service.calculateMultiTypeEffectiveness([1, 1])

      expect(repo.findActiveTypeNames).toHaveBeenCalledWith([1, 1])
      expect(data).toEqual({ weaknesses: { water: 4 }, resistances: {}, immunities: {} })
    })

    it('reports immunities and resistances', async () => {
      repo.getEffectivenessMatrix.mockResolvedValue({
        water: { grass: 0.5 },
        ghost: { normal: 0 }
      })
      repo.findActiveTypeNames.mockResolvedValue(['grass', 'normal'])

      const { data } = await service.calculateMultiTypeEffectiveness([2, 3])

      expect(data).toEqual({
        weaknesses: {},
        resistances: { water: 0.5 },
        immunities: { ghost: 0 }
      })
    })
  })
})
