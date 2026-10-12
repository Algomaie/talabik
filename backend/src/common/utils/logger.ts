import pino from 'pino';
import { config } from '../../config';

export const logger = pino({
  level: config.logging.level,
  transport: config.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
  base: {
    service: 'talbak-api',
    env: config.env,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      id: req.id,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
