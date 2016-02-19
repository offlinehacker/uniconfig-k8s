const expect = require('chai').expect;
const Config = require('uniconfig').Config;
const Errors = require('uniconfig').Errors;

const Kubernetes = require('../');

describe('Uniconfig K8S', () => {
  describe('integration tests', () => {
    before(() => {
      this.provider = new Kubernetes({
        host: process.env.KUBERNETES_SERVICE_HOST,
        protocol: process.env.KUBERNETES_SERVICE_PORT == '443' ? 'https' : 'http',
        version: process.env.KUBERNETES_API_VERSION || 'v1',
        token: process.env.KUBERNETES_TOKEN
      });

      this.config = new Config({
        name: 'test',
        options: [{
          name: 'a.b.c.d'
        }, {
          name: 'option2'
        }]
      });
    });

    // TODO: Make test deterministic
    it('should get option from current namespace', () => {
      return this.provider.get('a.b.c.d', {namespace: 'default'}).then(val => {
        expect(val).to.be.equal('10');
      });
    });

    it('should not find namespace', () => {
      return this.provider.get('a.b.c.d', {namespace: 'undefined'}).catch(Errors.NamespaceNotFound, err => {
        expect(err.name).to.be.equal('NamespaceNotFound');
      });
    });

    it('should not find option', () => {
      return this.provider.get('undefined', {namespace: 'default'}).catch(Errors.OptionNotFound, err => {
        expect(err.name).to.be.equal('OptionNotFound');
      });
    });
  });
});
