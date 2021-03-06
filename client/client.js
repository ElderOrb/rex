const { readFileSync, existsSync } = require('fs');
const path = require('path')
const { Client } = require('ssh2');
const dirName = path.dirname(process.execPath)
const pk = readFileSync(path.resolve(dirName, 'id_rsa'));
const configPath = path.resolve(dirName, 'config.json');
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath)) : { host : '127.0.0.1', port : 3333 }

var params = process.argv.slice(2);
var appName = ''
var paramsString = appName + params.join(' ');

if(paramsString === "help")
{
  console.debug('config: ', config);
  console.debug('configPath: ', configPath);

  console.log("__dirname:    ", __dirname);
  console.log("path.dirname(process.execPath): ", path.dirname(process.execPath))
  console.log("process.cwd() : ", process.cwd());
  console.log("./ : ", path.resolve("./"));
  console.log("filename: ", __filename);
}

const conn = new Client();
conn.on('ready', () => {
  conn.exec(paramsString, {}, (err, stream) => {
    if (err) throw err;

    stream.on('close', (code, signal) => {
      conn.end();
    }).stdout.on('data', (data) => {
      process.stdout.write('' + data);
    }).stderr.on('data', (data) => {
      process.stderr.write('' + data);
    });
  });
}).connect({
  host: config.host,
  port: config.port,
  username: 'frylock',
  privateKey: pk
});