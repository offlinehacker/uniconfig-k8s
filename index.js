'use strict';

const Client = require('node-kubernetes-client');
const _ = require('lodash');
const Promise = require('bluebird');

const Provider = require('uniconfig').Provider;
const Errors = require('uniconfig').Errors;

class Kubernetes extends Provider {
  constructor(config) {
    super(config);

    _.defaults(config, {
      timeout: 5000,
      protocol: 'http',
      version: 'v1'
    });

    this.client = new Client(config);

    if (this.client instanceof Error) {
      throw this.client;
    }

    this._options = {};
  }

  get(name, env) {
    const namespace = env.namespace || 'default';

    if (this._options[namespace]) {
      const value = _.get(this._options[namespace], name);
      if (!value) {
        return Promise.reject(new Errors.OptionNotFound(name));
      }

      return Promise.resolve(value);
    }

    return new Promise((res, rej) => {
      this.client.namespaces.get((err, namespaces) => {
        if (err) return rej(err);

        const ns = _.find(_.get(namespaces, '[0].items'), _.cond([
          [_.matchesProperty('metadata.annotations.namespace', namespace), _.identity],
          [_.matchesProperty('metadata.name', namespace), _.identity],
        ]));

        if (!ns) {
           return rej(new Errors.NamespaceNotFound(namespace));
        }

        const annotations = ns.metadata.annotations;
        const options = {};
        _.forEach(annotations, (key, value) => {
          _.set(options, value, key);
        });

        this._options[namespace] = options;
        res(this.get(name, env));
      });
    });
  }
}

module.exports = Kubernetes;
