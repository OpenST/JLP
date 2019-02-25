const { createLogger, format, transports } = require('winston');

const {
  combine, timestamp, prettyPrint,
} = format;

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    prettyPrint(),
  ),
  defaultMeta: { service: 'JLP' },
  transports: [
    new transports.File({ filename: 'log/error.log', level: 'error' }),
    new transports.File({ filename: 'log/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.simple(),
  }));
}

module.exports = logger;
