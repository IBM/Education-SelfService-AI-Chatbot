#! /usr/bin/env node
/* eslint no-console:0 */
'use strict';

require('dotenv');

const fs = require('fs');
const replace = require('replace');
const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
const async = require('async');
const path = require('path');

process.env.VCAP_SERVICES = process.env.VCAP_SERVICES || fs.readFileSync('./credentials.json', 'utf-8');

const discoveryV1 = new DiscoveryV1({ version: '2018-03-05' });
const retryOptions = { times: 3, interval: 200 };
const defaultConfigName = 'Default Configuration'; // Use default configuration
const collectionName = 'demoCollection';
const collectionDescription = 'Collection for Watson Assistant with Discovery - OpenWhisk';
const environmentName = 'demoEnvironment';
const environmentDescription = 'Environment for Watson Assistant with Discovery - OpenWhisk';


/**
 * Calls discovery getEnvironment with 3 retry options
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {Function} cb
 * @return {Object}
 */
const getEnvironmentAsync = function(params, cb) {
  return async.retry(retryOptions, discoveryV1.getEnvironment.bind(discoveryV1, {
    environment_id: params.env_id
  }), cb);
};

/**
 * Calls discovery getEnvironments with 3 retry options
 * @param  {Function} cb
 * @return {Object}
 */
const getEnvironmentsAsync = function(cb) {
  return async.retry(retryOptions, discoveryV1.listEnvironments.bind(discoveryV1, null), cb);
};

/**
 * Calls discovery createEnvironment with 3 retry options
 * @param  {Function} cb
 * @return {Object}
 */
const createEnvironmentAsync = function(cb) {
  return async.retry(retryOptions, discoveryV1.createEnvironment.bind(discoveryV1, {
    name: environmentName,
    description: environmentDescription,
    size: '0'
  }), cb);
};

/**
 * Calls discovery getConfigurations with 3 retry options
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {Function} cb
 * @return {Object}
 */
const getConfigurationsAsync = function(params, cb) {
  return async.retry(retryOptions, discoveryV1.listConfigurations.bind(discoveryV1, {
    environment_id: params.env_id
  }), cb);
};


/**
 * Calls discovery createConfiguration with 3 retry options
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {Function} cb
 * @return {Object}
 */
const createConfigurationAsync = function(params, cb) {
  const configFile = fs.readFileSync('./training/discovery_config.json', 'utf-8'); // If you are not using default configuration, add your configuration to ./training/discovery_config.json
  return async.retry(retryOptions, discoveryV1.createConfiguration.bind(discoveryV1, {
    environment_id: `${params.env_id}`,
    file: configFile
  }), cb);
};

/**
 * Calls discovery getCollections with 3 retry options
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {Function} cb
 * @return {Object}
 */
const getCollectionsAsync = function(params, cb) {
  return async.retry(retryOptions, discoveryV1.listCollections.bind(discoveryV1, {
    environment_id: `${params.env_id}`
  }), cb);
};

/**
 * Calls discovery createCollection with 3 retry options
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {String}   params.config_id
 * @param  {Function} cb
 * @return {Object}
 */
const createCollectionAsync = function(params, cb) {
  return async.retry(retryOptions, discoveryV1.createCollection.bind(discoveryV1, {
    environment_id: `${params.env_id}`,
    name: collectionName,
    description: collectionDescription,
    configuration_id: `${params.config_id}`,
  }), cb);
};

/**
 * Calls discovery addDocument to add a single document to collections with 3 retry options
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {String}   params.config_id
 * @param  {String}   params.file
 * @param  {String}   params.collection_id
 * @param  {Function} cb
 * @return {Object}
 */
const uploadDocumentAsync = function(params, cb) {
  return async.retry(retryOptions, discoveryV1.addDocument.bind(discoveryV1, {
    environment_id: `${params.env_id}`,
    collection_id: `${params.collection_id}`,
    file: params.file,
    configuration_id: `${params.config_id}`,
  }), cb);
};


/**
 * Calls uploadDocumentAsync to add a single document to collections
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {String}   params.config_id
 * @param  {String}   params.file
 * @param  {String}   params.collection_id
 * @param  {Function} cb
 * @return {Object}
 */
const uploadDocument = function(params, cb) {
  const wrapped = async.timeout(uploadDocumentAsync, 2000);
  wrapped(params, function(err, res) {
    if (err) {
      console.log(params.file.path, err);
      return cb();
    }
    cb(null, res);
  });
};

/**
 * Checks if envrionment exists otherwise create one
 * @param  {Function} callback
 * @return {Object}
 */
const getOrCreateEnvironment = function(callback) {
  console.log('Creating environment');
  getEnvironmentsAsync(function(listError, listResponse) {
    if (listError) {
      return callback(listError);
    }
    const environments = listResponse.environments
      .filter(function(environment) { return environment.name === environmentName; });
    if (environments.length === 1) {
      console.log(`Environment already exists, Using Environment ${environments[0].name}`);
      callback(null, environments[0]);
    } else {
      createEnvironmentAsync(function(createError, createResponse) {
        if (createError) {
          return callback(createError);
        }
        const timer = setInterval(function() {
          getEnvironmentAsync({ env_id: createResponse.environment_id }, function(getError, getResponse) {
            if (getError) {
              return callback(getError);
            }
            console.log(`Environment status: ${getResponse.status}`);
            if (getResponse.status === 'active') {
              clearInterval(timer);
              callback(null, getResponse);
            }
          });
        }, 5000);
      });
    }
  });
};


/**
 * checks if configuration exists otherwise create one
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {Function} callback
 * @return {[type]}
 */
const getOrCreateConfiguration = function(params, callback) {
  console.log('Creating a configuration');
  getConfigurationsAsync({
    env_id: params.env_id
  },
  function(listError, listResponse) {
    if (listError) {
      return callback(listError);
    }
    const configurations = listResponse.configurations
      .filter(function(configuration) {
        return configuration.name === defaultConfigName;
      });
    if (configurations.length === 1) {
      console.log(`Configuration already exists, Using configuration ${configurations[0].name}`);
      callback(null, configurations[0]);
    } else {
      createConfigurationAsync({
        env_id: params.env_id
      },
      function(createError, createResponse) {
        if (createError) {
          return callback(createError);
        }
        callback(null, createResponse);
      });
    }
  });
};

/**
 * checks if collection exists otherwise create one
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {String}   params.config_id
 * @param  {Function} callback
 * @return {[type]}
 */
const getOrCreateCollection = function(params, callback) {
  console.log('Creating a collection');
  getCollectionsAsync({
    env_id: params.env_id
  },
  function(listError, listResponse) {
    if (listError) {
      return callback(listError);
    }
    const collections = listResponse.collections
      .filter(function(collection) { return collection.name === collectionName; });
    if (collections.length === 1) {
      console.log(`Collection already exists, Using collection ${collections[0].name}`);
      callback(null, collections[0]);
    } else {
      createCollectionAsync({
        env_id: params.env_id,
        config_id: params.config_id,
      },
      function(createError, createResponse) {
        if (createError) {
          return callback(createError);
        }
        callback(null, createResponse);
      });
    }
  });
};


/**
 * Upload all the documents in discovery-documents
 * @param  {Object}   params
 * @param  {String}   env_id
 * @param  {String}   config_id
 * @param  {String}   collection_id
 * @param  {Function} callback
 * @return {Object}
 */
const uploadDocuments = function(params, callback) {
  console.log('Uploading documents');
  const asyncTasks = [];
  fs.readdir('./manualdocs/', function (err, files) {
    if (err) {
      throw err;
    }
    files.map(function (file) {
      return path.join('./manualdocs/', file);
    }).filter(function (file) {
      return fs.statSync(file).isFile();
    }).forEach(function (file) {
      asyncTasks.push(uploadDocument.bind(this, {
        env_id: params.env_id,
        config_id: params.config_id,
        file: fs.createReadStream(file),
        collection_id: params.collection_id
      }));
    });
    async.parallelLimit(asyncTasks, 5, function(err, res) {
      if (err) {
        return callback(err);
      }
      callback(null, res);
    });
  });
};

/**
 * Update the .env file
 * @param  {Object} params
 * @param  {String} params.regexText
 * @param  {String} params.replacement
 */
const updateEnvProperties= function(params) {
  replace({
    regex: params.regexText,
    replacement: params.replacement,
    paths: ['./.env'],
    recursive: true,
    silent: true
  });
};


getOrCreateEnvironment(function(error, environment) {
  if (error) {
    console.log(error);
    return;
  }
  getOrCreateConfiguration({
    env_id: environment.environment_id
  },
  function(errorConfiguration, configuration) {
    if (errorConfiguration) {
      console.log(errorConfiguration);
      return;
    }
    getOrCreateCollection({
      env_id: environment.environment_id,
      config_id: configuration.configuration_id
    },
    function(errorCollection, collection) {
      if (errorCollection) {
        console.log(errorCollection);
        return;
      }
      uploadDocuments({
        env_id: environment.environment_id,
        config_id: configuration.configuration_id,
        collection_id: collection.collection_id
      },
      function(errorUpload, docs) {
        if (errorUpload) {
          console.log('error',errorUpload);
          return;
        }
        console.log(`${docs.length} documents uploaded`);
        console.log('Updating .env file');
        updateEnvProperties({
          regexText: 'REPLACE WITH YOUR ENVIRONMENT ID',
          replacement: environment.environment_id
        });
        updateEnvProperties({
          regexText: 'REPLACE WITH YOUR CONFIGURATION ID',
          replacement: configuration.configuration_id
        });
        updateEnvProperties({
          regexText: 'REPLACE WITH YOUR COLLECTION ID',
          replacement: collection.collection_id
        });
        console.log('finishing...');
        process.exit(0);
      });
    });
  });
});
