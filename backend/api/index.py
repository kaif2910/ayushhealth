import traceback

async def app(scope, receive, send):
    try:
        from app.main import app as main_app
        return await main_app(scope, receive, send)
    except Exception as e:
        err = traceback.format_exc().encode('utf-8')
        if scope['type'] == 'http':
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [
                    (b'content-type', b'text/plain; charset=utf-8'),
                ]
            })
            await send({
                'type': 'http.response.body',
                'body': b"Startup Crash Trace:\n\n" + err
            })
