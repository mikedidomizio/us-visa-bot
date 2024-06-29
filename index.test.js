import { afterEach, afterAll, beforeEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

describe('main', () => {

    beforeEach(vi.resetModules)

    beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    test('should successfully book time', {timeout: 2000 }, () => new Promise(async done => {
        process.argv = ['', '', '2099-01-01']
        vi.stubEnv('LOCALE', 'en-ca')
        vi.stubEnv('EMAIL', 'test@example.com')
        vi.stubEnv('PASSWORD', '123')
        vi.stubEnv('FACILITY_ID', '555')
        vi.stubEnv('SCHEDULE_ID', '222')

        server.use(
            http.get('https://ais.usvisa-info.com/en-ca/niv/users/sign_in', () => {
                return new HttpResponse('<html><head><meta name="csrf-token" content="123" /></head></html>', {
                    headers: {
                        'Set-Cookie': '_yatri_session=123',
                        'X-CSRF-TOKEN': '123'
                    },
                })
            }),
            http.post('https://ais.usvisa-info.com/en-ca/niv/users/sign_in', () => {
                return new HttpResponse(null, {
                    headers: {
                        'Set-Cookie': '_yatri_session=123',
                        'X-CSRF-TOKEN': '123'
                    },
                })
            }),
            http.get('https://ais.usvisa-info.com/en-ca/niv/schedule/222/appointment/days/555.json', () => {
                return HttpResponse.json([{
                    date: '2029-01-01',
                    business_day: true,
                }])
            }),
            http.get('https://ais.usvisa-info.com/en-ca/niv/schedule/222/appointment/times/555.json', ({ request }) => {
                return HttpResponse.json({
                    business_times: ['00:00'] // todo I don't actually know what this value looks like from the real API
                })
            }),
            http.get('https://ais.usvisa-info.com/en-ca/niv/schedule/222/appointment', () => {
                return new HttpResponse('<html><head><meta name="csrf-token" content="123" /></head></html>', {
                    headers: {
                        'Set-Cookie': '_yatri_session=123',
                        'X-CSRF-TOKEN': '123'
                    },
                })
            }),
            http.post('https://ais.usvisa-info.com/en-ca/niv/schedule/222/appointment', () => {
                done()
                return new HttpResponse({})
            })
        )

        await import('./index.js')
    }))
})
