import { UserGachaPityMessage } from '@/i18n/message-keys'
import { TranslatableMessage } from '@/i18n/response-message'
import { UserGachaPityController } from './user-gacha-pity.controller'

// GET /user-gacha-pity/user/present makes the pity row on first read: the
// service says whether it did, the controller picks the key with msg() and
// TransformInterceptor translates it (P5d).
describe('UserGachaPityController.getUserPityNow', () => {
  it('created on first read: CREATE_SUCCESS, else GET_LIST_SUCCESS', async () => {
    const service = { getUserPityNow: jest.fn() }
    const controller = new UserGachaPityController(service as never)
    const data = { id: 1, pityCount: 0 }
    for (const [created, key] of [
      [true, UserGachaPityMessage.CREATE_SUCCESS],
      [false, UserGachaPityMessage.GET_LIST_SUCCESS]
    ] as const) {
      service.getUserPityNow.mockResolvedValue({ created, data })
      const result = await controller.getUserPityNow(7)
      expect(result.data).toBe(data)
      expect(result.message).toBeInstanceOf(TranslatableMessage)
      expect(result.message.key).toBe(key)
    }
    expect(service.getUserPityNow).toHaveBeenCalledWith(7)
  })
})
