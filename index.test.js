import { afterEach, afterAll, beforeEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
    http.get('http://example.com', ({ request }) => {
        console.log('in here???? ', request.url)
        return new HttpResponse(null, {
            status: 200,
            statusText: 'Out Of Apples',
        })
    }),
)

describe('main', () => {

    beforeEach(vi.resetModules)

    beforeAll(() => server.listen({
        onUnhandledRequest(request) {
            console.log('Unhandled %s %s', request.method, request.url)
        },
    }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    test('should exit if no current booked date provided', async () => {
        const exitSpy = vi.spyOn(process, 'exit')
        exitSpy.mockReturnValueOnce(process.exit)

        await import('./index.js')

        expect(exitSpy).toHaveBeenCalledWith(1)
    })

    test('should login', async () => {
        process.argv = ['', '', '2099-01-01']
        vi.stubEnv('LOCALE', 'en-ca')
        vi.stubEnv('EMAIL', 'test@example.com')
        vi.stubEnv('PASSWORD', '123')

        // await server.use(
        //     http.get('http://example.com/', () => {
        //         console.log('???aaaa')
        //         return new HttpResponse(null, {
        //             status: 200,
        //             statusText: 'Out Of Apples',
        //         })
        //     }),
        //     http.get('https://ais.usvisa-info.com/en-ca/niv/users/sign_in', () => {
        //         return new HttpResponse('<html><head><meta name="csrf-token" content="123" /></head></html>', {
        //             headers: {
        //                 'Set-Cookie': '_yatri_session=123',
        //                 'X-CSRF-TOKEN': '123'
        //             },
        //         })
        //     }),
        //     http.post('https://ais.usvisa-info.com/en-ca/niv/users/sign_in', () => {
        //         console.log('intercepted')
        //         // return new HttpResponse(null, {
        //         // })
        //     })
        // )

        await import('./index.js')
    })
})
