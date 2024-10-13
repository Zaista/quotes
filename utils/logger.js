import log4js from 'log4js';

log4js.configure({
  appenders: {
    out: { type: 'stdout' },
  },
  categories: {
    default: { appenders: ['out'], level: 'info' },
    app: { appenders: ['out'], level: 'info' },
    session: { appenders: ['out'], level: 'info' },
    quotes: { appenders: ['out'], level: 'info' },
  },
});

export function getLogger(category) {
  return log4js.getLogger(category);
}
