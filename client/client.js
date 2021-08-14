const { readFileSync } = require('fs');
const path = require('path')
const { Client } = require('ssh2');
const pk = readFileSync(path.resolve(__dirname, 'id_rsa'));

var params = process.argv.slice(2);
var paramsString = params.join(' ');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(paramsString, {}, (err, stream) => {
    if (err) throw err;

    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).stdout.on('data', (data) => {
      console.log('' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: 'localhost',
  port: 333,
  username: 'frylock',
  privateKey: pk
});