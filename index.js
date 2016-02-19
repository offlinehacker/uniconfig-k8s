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
      timeout: 5000
    });

    this.client = new Client(config);

    if (this.client instanceof Error) {
      throw this.client;
    }

    this._options = {};
  }

  get(name, env) {
    if (this._options[env.namespace]) {
      const value = _.get(this._options[env.namespace], name);
      if (!value) {
        return Promise.reject(new Errors.OptionNotFound(name));
      }

      return Promise.resolve(value);
    }

    return new Promise((res, rej) => {
      this.client.namespaces.get((err, namespaces) => {
        if (err) return rej(err);

        const ns = _.find(_.get(namespaces, '[0].items'), _.cond([
          [_.matchesProperty('metadata.annotations.namespace', env.namespace), _.identity],
          [_.matchesProperty('metadata.name', env.namespace), _.identity],
        ]));

        if (!ns) {
           return rej(new Errors.NamespaceNotFound(env.namespace));
        }

        const annotations = ns.metadata.annotations;
        const options = {};
        _.forEach(annotations, (key, value) => {
          _.set(options, value, key);
        });

        this._options[env.namespace] = options;
        res(this.get(name, env));
      });
    });
  }
}

module.exports = Kubernetes;
