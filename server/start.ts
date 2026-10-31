import {mkdirSync} from 'node:fs';
import {createRelay} from './relay';
mkdirSync('.data',{recursive:true});
const relay=createRelay(process.env.CRIBBAGE_DB??'.data/cribbage.sqlite',Number(process.env.PORT??5198),process.env.HOST??'127.0.0.1');
console.log(`Cribbage: http://${relay.server.hostname}:${relay.server.port}`);
process.on('SIGTERM',()=>{relay.close();process.exit(0);});
process.on('SIGINT',()=>{relay.close();process.exit(0);});
