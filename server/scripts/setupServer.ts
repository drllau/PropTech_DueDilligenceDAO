import http from 'http';
import { Express } from 'express-serve-static-core';
import { DEFAULT_PORT } from '../config';
import { factory, formatFilename } from '../../shared/logging';
import { setupWebSocketServer } from '../socket';
import Rollbar from "rollbar";
const log = factory.getLogger(formatFilename(__filename));

const setupServer = (app: Express, rollbar: Rollbar) => {
  const port = process.env.PORT || DEFAULT_PORT;
  app.set('port', port);
  const server = http.createServer(app);
  setupWebSocketServer(server, rollbar);

  const onError = (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }
    switch (error.code) {
      case 'EACCES':
        log.error('Port requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        log.error(`Port ${port} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  };

  const onListen = () => {
    const addr = server.address();
    if (typeof addr === 'string') {
      log.info(`Listening on ${addr}`);
    } else {
      log.info(`Listening on port ${addr.port}`);
    }
  };

  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListen);
};

export default setupServer;
