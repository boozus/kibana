import { get } from 'lodash';

export class KibanaServerUiSettings {
  constructor(log, es, kibanaVersion) {
    this.es = es;
    this.log = log;
    this.kibanaVersion = kibanaVersion;
  }

  async _docParams() {
    const { kibanaVersion } = this;
    return {
      index: '.kibana',
      type: 'config',
      id: await kibanaVersion.get()
    };
  }

  async existInEs() {
    const { es } = this;
    return await es.exists(await this._docParams());
  }

  async _read() {
    const { log, es } = this;
    try {
      const doc = await es.get(await this._docParams());
      log.verbose('Fetched kibana config doc', doc);
      return doc;
    } catch (err) {
      log.debug('Failed to fetch kibana config doc', err.message);
      return;
    }
  }

  /*
  ** Gets defaultIndex from the config doc.
  */
  async getDefaultIndex() {
    const { log } = this;
    const doc = await this._read();
    const defaultIndex = get(doc, ['_source', 'defaultIndex']);
    log.verbose('uiSettings.defaultIndex: %j', defaultIndex);
    return defaultIndex;
  }

  async replace(doc) {
    const { log, es } = this;
    log.debug('updating kibana config doc: %j', doc);
    await es.index({
      ...(await this._docParams()),
      refresh: 'wait_for',
      body: doc,
    });
  }

  /**
  * Add fields to the config doc (like setting timezone and defaultIndex)
  * @return {Promise} A promise that is resolved when elasticsearch has a response
  */
  async update(doc) {
    const { log, es } = this;
    log.debug('updating kibana config doc: %j', doc);
    await es.update({
      ...(await this._docParams()),
      refresh: 'wait_for',
      body: { doc, upsert: doc },
    });
  }
}
