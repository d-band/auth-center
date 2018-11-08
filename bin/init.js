'use strict';

const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;

const databases = ['SQLite', 'MySQL', 'PostgreSQL', 'MariaDB', 'MSSQL'];

function run(cmd, args, fn) {
  args = args || [];
  var runner = spawn(cmd, args, {
    stdio: "inherit"
  });
  runner.on('close', function(code) {
    if (fn) {
      fn(code);
    }
  });
}

module.exports = function() {
  let questions = [{
    type: 'input',
    name: 'domain',
    message: 'Domain:',
    default: 'http://passport.example.com'
  }, {
    type: 'input',
    name: 'logo',
    message: 'Logo:',
    default: 'http://example.com/icon.png'
  }, {
    type: 'list',
    name: 'database',
    message: 'Database:',
    choices: databases
  }, {
    type: 'list',
    name: 'session',
    message: 'Session Store:',
    choices: ['Memory', 'Redis']
  }];

  inquirer
    .prompt(questions)
    .then(function(options) {
      let pkg = {
        name: path.basename(process.cwd()),
        version: '1.0.0',
        scripts: {
          start: 'auth-center start -c config.js'
        },
        dependencies: {}
      };

      if (options.session === 'Redis') {
        pkg.dependencies['koa-redis'] = 'latest';
      }

      switch (options.database) {
        case 'SQLite':
          pkg.dependencies['sqlite3'] = 'latest';
          break;
        case 'MySQL':
          pkg.dependencies['mysql2'] = 'latest';
          break;
        case 'PostgreSQL':
          pkg.dependencies['pg'] = 'latest';
          pkg.dependencies['pg-hstore'] = 'latest';
          break;
        case 'MariaDB':
          pkg.dependencies['mysql2'] = 'latest';
          break;
        case 'MSSQL':
          pkg.dependencies['tedious'] = 'latest';
          break;
      }

      fs.writeFileSync('package.json', JSON.stringify(pkg, null, '  '), 'utf8');

      console.log('Generate package.json done.');

      let tpl = fs.readFileSync(path.join(__dirname, '_config.js'), 'utf8');

      tpl = tpl
        .replace(/__domain__/, options.domain)
        .replace(/__logo__/, options.logo);

      databases.push('Redis');

      for (let db of databases) {
        let r = new RegExp('/\\*' + db + '\\*/([\\s\\S]*?)/\\*' + db + '\\*/', 'gm');
        if (options.database === db || options.session === db) {
          tpl = tpl.replace(r, '$1\n');
        } else {
          tpl = tpl.replace(r, '');
        }
      }

      tpl = tpl.replace(/^\s*[\r\n]/gm, '');

      fs.writeFileSync('config.js', tpl, 'utf8');

      console.log('Generate config.js done.');

      run('npm', ['install'], function() {
        console.log('npm install done.');
      });
    });
};
