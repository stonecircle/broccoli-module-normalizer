'use strict';

const helper = require('broccoli-test-helper');
const co = require('co');
const expect = require('chai').expect;
const sinon = require('sinon');
const symlinkOrCopy = require('symlink-or-copy');
const ModuleNormalizer = require('..');
const createBuilder = helper.createBuilder;
const createTempDir = helper.createTempDir;

describe('Fix Module Folders', function() {
  let input, output;
  let callback;

  [true, false, undefined].forEach(canSymlink => {

    describe(`- canSymlink: ${canSymlink} -`, function() {

      beforeEach(co.wrap(function * () {
        input = yield createTempDir();

        symlinkOrCopy.setOptions({
          isWindows: process.platform === 'win32',
          fs: require('fs'),
          canSymlink
        });

        callback = sinon.spy();

        let subject = new ModuleNormalizer(input.path(), {
          canSymlink,
          callback
        });
        output = createBuilder(subject);
      }));

      afterEach(co.wrap(function * () {
        yield input.dispose();
        yield output.dispose();
      }));

      it('should remove the modules folder if it exists', co.wrap(function * () {
        input.write({
          'modules': {
            'ember-data': {
              'index.js': `exports { * } from './whatever'`
            }
          }
        });

        yield output.build();

        expect(output.read()).to.deep.equal({
          'ember-data': {
            'index.js': `exports { * } from './whatever'`
          }
        });

        yield output.build();

        expect(output.changes()).to.deep.equal({});
      }));

      it('should do nothing if there is no modules folder', co.wrap(function * () {
        input.write({
          'ember-data': {
            'index.js': `exports { * } from './whatever'`
          }
        });

        yield output.build();

        expect(output.read()).to.deep.equal({
          'ember-data': {
            'index.js': `exports { * } from './whatever'`
          }
        });

        yield output.build();

        expect(output.changes()).to.deep.equal({});
      }));

      it('should handle files in both modules folder and root', co.wrap(function * () {
        input.write({
          'modules': {
            'ember-data': {
              'index.js': `exports { * } from './whatever'`
            }
          },
          'ember-inflector': {
            'index.js': `exports { * } from './whateverElse'`
          }
        });

        yield output.build();

        expect(output.read()).to.deep.equal({
          'ember-data': {
            'index.js': `exports { * } from './whatever'`
          },
          'ember-inflector': {
            'index.js': `exports { * } from './whateverElse'`
          }
        });

        yield output.build();

        expect(output.changes()).to.deep.equal({});
      }));

      it('should handle files in both modules folder and root with same name', co.wrap(function * () {
        input.write({
          'modules': {
            'ember-data': {
              'whatever.js': `exports { * } from './whatever'`
            }
          },
          'ember-data': {
            'whateverElse.js': `exports { * } from './whateverElse'`
          }
        });

        yield output.build();

        expect(output.read()).to.deep.equal({
          'ember-data': {
            'whatever.js': `exports { * } from './whatever'`,
            'whateverElse.js': `exports { * } from './whateverElse'`
          }
        });

        yield output.build();

        expect(output.changes()).to.deep.equal({});
      }));

      it('should have updated the contents of the addon file if the addon updates its contents', co.wrap(function * () {
        input.write({
          'modules': {
            'ember-data': {
              'index.js': `exports { * } from './whatever'`
            }
          }
        });

        yield output.build();

        input.write({
          'modules': {
            'ember-data': {
              'index.js': `exports { * } from './whateverElse'`
            }
          }
        });

        yield output.build();

        expect(output.read()).to.deep.equal({
          'ember-data': {
            'index.js': `exports { * } from './whateverElse'`
          }
        });

        expect(output.changes()).to.deep.equal({
          'ember-data/index.js': 'change'
        });
      }));

      it('should call a callback if the modules folder exists', co.wrap(function * () {
        input.write({
          'modules': {
            'ember-data': {
              'index.js': `exports { * } from './whatever'`
            }
          }
        });

        yield output.build();

        expect(callback.calledOnce).to.be.ok;
      }));
    });
  });
});
