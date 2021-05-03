/* Entry point into server. */

require('dotenv').config();
const cors = require('cors');
require('newrelic');
import helmet = require('helmet');
import express = require('express');
import router from './routes';
import onConnection from './socketHandler';

const PORT = process.env.PORT || 3001;

const app = express();

// SOCKETS
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
  cors: {
    origin: 'http://localhost:3000', // TODO CHANGE FOR SERVER
    methods: ['GET', 'POST'],
  },
});

// handles sockets
io.on('connection', onConnection);
httpServer.listen(4000, () => {
  console.log('sockets are listening on 4000');
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

app.use('/api', router);
app.set('io', io);

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
