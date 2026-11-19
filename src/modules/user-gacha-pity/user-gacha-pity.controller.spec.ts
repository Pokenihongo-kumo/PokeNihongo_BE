import { UserGachaPityMessage } from '@/i18n/message-keys'
import { UserGachaPityController } from './user-gacha-pity.controller'

// GET /user-gacha-pity/user/present makes the pity row on first read: the
// service says whether it did, the controller picks the message.
describe('UserGachaPityController.getUserPityNow', () => {
  it('created on first read: CREATE_SUCCESS, else GET_LIST_SUCCESS', async () => {
    const service = { getUserPityNow: jest.fn() }
    const controller = new UserGachaPityController(
      service as never,
      {
        translate: (key: string) => key
      } as never
    )
    const data = { id: 1, pityCount: 0 }
    for (const [created, message] of [
      [true, UserGachaPityMessage.CREATE_SUCCESS],
      [false, UserGachaPityMessage.GET_LIST_SUCCESS]
    ] as const) {
      service.getUserPityNow.mockResolvedValue({ created, data })
      await expect(controller.getUserPityNow(7, 'en')).resolves.toEqual({ message, data })
    }
    expect(service.getUserPityNow).toHaveBeenCalledWith(7)
  })
})
