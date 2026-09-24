/**
 * State Engine
 * Contains helper functions for interacting with the CoordinationProvider.
 */
import { GitProvider } from '../coordination/git-provider.js';
import { findProjectRoot } from '../config.js';

export function getProvider(projectRoot = findProjectRoot()) {
  // Return a new instance every time so we don't leak state between unit tests
  return new GitProvider(projectRoot);
}

export async function initializeState(projectRoot = findProjectRoot()) {
  const provider = getProvider(projectRoot);
  await provider.init();
}

export async function getState(projectRoot = findProjectRoot()) {
  const provider = getProvider(projectRoot);
  return await provider.getState();
}

export async function acquireLease(lease, projectRoot = findProjectRoot()) {
  const provider = getProvider(projectRoot);
  return await provider.acquire(lease);
}

export async function releaseLease(zone, owner, force = false, projectRoot = findProjectRoot()) {
  const provider = getProvider(projectRoot);
  return await provider.release(zone, owner, force);
}

export async function createRequest(request, projectRoot = findProjectRoot()) {
  const provider = getProvider(projectRoot);
  return await provider.requestAccess(request);
}

export async function approveRequest(requestId, approver, projectRoot = findProjectRoot()) {
  const provider = getProvider(projectRoot);
  return await provider.approveRequest(requestId, approver);
}
