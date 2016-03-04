'use strict';

const fs = require('fs');
const Client = require('node-kubernetes-client');
const _ = require('lodash');
const Promise = require('bluebird');

const Provider = require('uniconfig').Provider;
const Errors = require('uniconfig').Errors;

class Kubernetes extends Provider {
  constructor(config) {
    super(config, true);

    // Check if running in kubernetes container and use service account
    if (process.env.KUBERNETES_SERVICE_HOST) {
      token = fs.readFileSync('/run/secrets/kubernetes.io/serviceaccount/token');

      _.defaults(this.config, {
        host: `${process.env.KUBERNETES_SERVICE_HOST}:${process.env.KUBERNETES_SERVICE_PORT || 8080}`,
        protocol: 'https',
        token: token
      });
    } else {
      _.defaults(this.config, {
        timeout: 5000,
        protocol: 'http',
        version: 'v1'
      });
    }

    this.client = new Client(this.config);

    if (this.client instanceof Error) {
      throw this.client;
    }
  }

  get namespaces() {
    if (this._namespaces) {
      return this._namespaces;
    }

    return this._namespaces = new Promise((res, rej) => {
      this.client.namespaces.get((err, namespaces) => {
        if (err) return rej(err);
        res(namespaces);
      });
    });
  }

  get(name, env) {
    const namespace = env.namespace || 'default';

    return this.namespaces.then(namespaces => {
      const ns = _.find(_.get(namespaces, '[0].items'), _.cond([
        [_.matchesProperty('metadata.annotations.namespace', namespace), _.identity],
        [_.matchesProperty('metadata.name', namespace), _.identity],
      ]));

      if (!ns) {
          return Promise.reject(new Errors.NamespaceNotFound(namespace));
      }

      const annotations = ns.metadata.annotations;
      const options = {};
      _.forEach(annotations, (key, value) => {
        _.set(options, value, key);
      });

      const value = _.get(options, name);
      if (!value) {
        return Promise.reject(new Errors.OptionNotFound(name));
      }

      return Promise.resolve(value);
    });
  }
}

module.exports = Kubernetes;
