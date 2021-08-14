const { timingSafeEqual } = require('crypto');
const { readFileSync } = require('fs');
const { inspect } = require('util');
const { spawn, spawnSync } = require('child_process');

const { utils, Server } = require('ssh2');
const path = require('path')

const allowedUser = Buffer.from('foo');
const allowedPassword = Buffer.from('bar');
const allowedPubKey = utils.parseKey(readFileSync(path.resolve(__dirname, 'id_rsa.pub')));

function checkValue(input, allowed) {
  const autoReject = (input.length !== allowed.length);
  if (autoReject) {
    // Prevent leaking length information by always making a comparison with the
    // same input when lengths don't match what we expect ...
    allowed = input;
  }
  const isMatch = timingSafeEqual(input, allowed);
  return (!autoReject && isMatch);
}

new Server({
  hostKeys: [readFileSync('id_rsa')]
}, (client) => {
  console.log('Client connected!');

  client.on('authentication', (ctx) => {
    let allowed = true;
    /*
    if (!checkValue(Buffer.from(ctx.username), allowedUser))
      allowed = false;

    switch (ctx.method) {
      case 'password':
        if (!checkValue(Buffer.from(ctx.password), allowedPassword))
          return ctx.reject();
        break;
      case 'publickey':
        if (ctx.key.algo !== allowedPubKey.type
            || !checkValue(ctx.key.data, allowedPubKey.getPublicSSH())
            || (ctx.signature && allowedPubKey.verify(ctx.blob, ctx.signature) !== true)) {
          return ctx.reject();
        }
        break;
      default:
        return ctx.reject();
    }
    */
    if (allowed)
      ctx.accept();
    else
      ctx.reject();
  }).on('ready', () => {
    console.log('Client authenticated!');

    client.on('session', (accept, reject) => {
      accept().once('pty', (accept, reject, info) => {
        rows = info.rows;
        cols = info.cols;
        term = info.term;
        accept && accept();
      }).once('exec', (accept, reject, info) => {
        console.log('Client wants to execute: ' + inspect(info.command));

        var args = info.command.split(' ');
        var cmd = args.shift();

        const stream = accept();
        try {
          const process = spawn(cmd, args, { shell: true });
          process.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            stream.stdout.write(data);
          });
  
          process.stderr.on('data', (data) => {
            stream.stderr.write(data);
            console.error(`stderr: ${data}`);
          });
  
          process.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            stream.exit(code);
            stream.end();
          });  
        }
        catch(err) {
          stream.stderr.write(JSON.stringify(err, 0, 4));
          stream.exit(0);
          stream.end();
        }
      });
    });
  }).on('close', () => {
    console.log('Client disconnected');
  }).on('error', (err) => {
    console.debug('Client connection aborted...');
  });
}).listen(333, '127.0.0.1', function() {
  console.log('Listening on port ' + this.address().port);
});