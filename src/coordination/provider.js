/**
 * CoordinationProvider interface definition.
 */

export class CoordinationProvider {
  /**
   * Initialize the provider
   */
  async init() {
    throw new Error('Not implemented');
  }

  /**
   * Acquire a lock/lease
   * @param {Object} lease Request params (zone, paths, owner, etc.)
   * @returns {Promise<{success: boolean, message: string, state: Object}>}
   */
  async acquire(lease) {
    throw new Error('Not implemented');
  }

  /**
   * Release a lock/lease
   * @param {string} zone
   * @param {string} owner
   * @param {boolean} force
   * @returns {Promise<{success: boolean, message: string, state: Object}>}
   */
  async release(zone, owner, force = false) {
    throw new Error('Not implemented');
  }

  /**
   * Retrieve the current state
   * @returns {Promise<Object>}
   */
  async getState() {
    throw new Error('Not implemented');
  }

  /**
   * Record a cross-boundary request
   */
  async requestAccess(request) {
    throw new Error('Not implemented');
  }

  /**
   * Approve a request
   */
  async approveRequest(requestId, approver) {
    throw new Error('Not implemented');
  }
}
