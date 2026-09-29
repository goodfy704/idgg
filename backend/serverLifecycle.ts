import type { Server } from 'node:http';

type LifecyclePhase = 'starting' | 'ready' | 'shutting-down' | 'stopped';

type ServerLifecycleOptions = {
    shutdownGraceMilliseconds: number;
    closeResources: () => Promise<void>;
};

export type ServerLifecycle = {
    canStart: () => boolean;
    isReady: () => boolean;
    isShuttingDown: () => boolean;
    markReady: () => boolean;
    shutdown: (server: Server | null) => Promise<void>;
};

const closeHttpServer = async (server: Server | null): Promise<void> => {
    if (!server || !server.listening) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        server.close(error => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
        server.closeIdleConnections();
    });
};

export const createServerLifecycle = (
    options: ServerLifecycleOptions
): ServerLifecycle => {
    let phase: LifecyclePhase = 'starting';
    let shutdownPromise: Promise<void> | null = null;

    const performShutdown = async (server: Server | null): Promise<void> => {
        let shutdownFailed = false;
        const shutdownDeadline = setTimeout(() => {
            server?.closeAllConnections();
            console.error('Server shutdown deadline exceeded.');
            process.exit(1);
        }, options.shutdownGraceMilliseconds);
        shutdownDeadline.unref();

        try {
            try {
                await closeHttpServer(server);
            } catch {
                shutdownFailed = true;
            }

            try {
                await options.closeResources();
            } catch {
                shutdownFailed = true;
            }
        } finally {
            clearTimeout(shutdownDeadline);
            phase = 'stopped';
        }

        if (shutdownFailed) {
            console.error('Server shutdown failed.');
            process.exitCode = 1;
        }
    };

    return {
        canStart: () => phase === 'starting',
        isReady: () => phase === 'ready',
        isShuttingDown: () => phase === 'shutting-down' || phase === 'stopped',
        markReady: () => {
            if (phase !== 'starting') {
                return false;
            }

            phase = 'ready';
            return true;
        },
        shutdown: (server) => {
            if (!shutdownPromise) {
                phase = 'shutting-down';
                shutdownPromise = performShutdown(server);
            }

            return shutdownPromise;
        },
    };
};
