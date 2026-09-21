// Connect only to the local, explicitly opened import browser. Credentials stay in memory.
export async function connectLaterem(port = 9222) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid browser port');
    const response = await fetch(`http://127.0.0.1:${port}/json/list`, {signal: AbortSignal.timeout(5000)});
    const pages = await response.json();
    const page = pages.find((page) => page.type === 'page' && page.url.startsWith('https://b2b.laterem.ua/'));
    if (!page) throw new Error('Open Laterem and sign in in the import Chrome window first');
    const endpoint = new URL(page.webSocketDebuggerUrl);
    if (endpoint.hostname !== '127.0.0.1' || endpoint.port !== String(port)) throw new Error(
        'Unexpected browser endpoint');
    const socket = new WebSocket(endpoint);
    await new Promise((resolve,
                       reject) => {
        const timer = setTimeout(() => {
            socket.close();
            reject(new Error('Browser connection timed out'));
        }, 5000);
        socket.addEventListener('open', () => {
            clearTimeout(timer);
            resolve();
        }, {once: true});
        socket.addEventListener('error', () => {
            clearTimeout(timer);
            reject(new Error('Cannot connect to import Chrome'));
        }, {once: true});
    });
    let sequence = 0;
    const pending = new Map();
    const listeners = new Set();
    socket.addEventListener('message', ({data}) => {
        const message = JSON.parse(data);
        if (message.id && pending.has(message.id)) {
            const {
                resolve,
                reject,
                timer
            } = pending.get(message.id);
            clearTimeout(timer);
            pending.delete(message.id);
            if (message.error) reject(new Error('Browser command failed')); else resolve(message.result);
        } else if (message.method) listeners.forEach((listener) => listener(message));
    });
    socket.addEventListener('close', () => {
        for (const {
            reject,
            timer
        } of pending.values()) {
            clearTimeout(timer);
            reject(new Error('Browser disconnected'));
        }
        pending.clear();
    });
    const send = (method,
                  params = {}) => new Promise((resolve,
                                               reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error('Browser command timed out'));
        }, 30000);
        pending.set(id, {
            resolve,
            reject,
            timer
        });
        socket.send(JSON.stringify({
            id,
            method,
            params
        }));
    });
    return {
        send,
        async evaluate(expression) {
            const result = await send('Runtime.evaluate', {
                expression,
                returnByValue: true,
                awaitPromise : true
            });
            if (result.exceptionDetails) throw new Error('Laterem browser evaluation failed');
            return result.result.value;
        },
        async authorization() {
            await send('Network.enable');
            return new Promise((resolve,
                                reject) => {
                const cleanup = () => {
                    clearTimeout(timer);
                    listeners.delete(listener);
                };
                const timer = setTimeout(() => {
                    cleanup();
                    reject(new Error('Sign in to Laterem, open the catalog, then retry the import'));
                }, 25000);
                const listener = ({
                                      method,
                                      params
                                  }) => {
                    if (method !== 'Network.requestWillBeSent' ||
                        !params.request.url.startsWith('https://laterem.ua/json/v2/product-page.do/')) return;
                    const auth = Object.entries(params.request.headers)
                                       .find(([key]) => key.toLowerCase() === 'authorization')?.[1];
                    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
                        cleanup();
                        resolve(auth);
                    }
                };
                listeners.add(listener);
                send('Page.reload')
                    .catch(() => {
                        cleanup();
                        reject(new Error('Could not reload Laterem catalog'));
                    });
            });
        },
        close() {
            socket.close();
        },
    };
}
