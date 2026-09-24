import { simpleGit } from 'simple-git';
import fs from 'fs';
import path from 'path';
import { CoordinationProvider } from './provider.js';
import crypto from 'crypto';

export class GitProvider extends CoordinationProvider {
  constructor(projectRoot, remote = 'origin', branch = 'ofa/state') {
    super();
    this.projectRoot = projectRoot;
    this.remote = remote;
    this.branch = branch;
    this.git = simpleGit(this.projectRoot);
  }

  async init() {
    let localBranches = await this.git.branchLocal();
    let remoteBranches = await this.git.branch(['-r']);

    const remoteBranchName = `${this.remote}/${this.branch}`;
    const hasLocal = localBranches.all.includes(this.branch);
    const hasRemote = remoteBranches.all.includes(remoteBranchName);

    if (hasRemote && !hasLocal) {
      await this.git.fetch(this.remote, this.branch);
      await this.git.checkoutBranch(this.branch, remoteBranchName);
      await this.git.checkout('-');
    } else if (!hasLocal && !hasRemote) {
      const currentBranch = (await this.git.branchLocal()).current;
      await this.git.checkout(['--orphan', this.branch]);
      await this.git.rm(['-rf', '.']);

      const initialState = {
        version: 1,
        locks: [],
        requests: [],
        tasks: []
      };

      fs.writeFileSync(path.join(this.projectRoot, 'state.json'), JSON.stringify(initialState, null, 2));
      await this.git.add('state.json');
      await this.git.commit('chore(ofa): initialize coordination state');

      try {
        const hasRemoteCheck = await this.git.branch(['-r']);
        if (hasRemoteCheck.all.includes(`${this.remote}/${this.branch}`)) {
            await this.git.push(this.remote, this.branch);
        }
      } catch (e) {
        console.warn('Could not push initial state to remote. Working locally.');
      }
      if (currentBranch) {
        await this.git.checkout(currentBranch);
      }
    }
  }

  async _transaction(mutator) {
    const currentBranch = (await this.git.branchLocal()).current;
    if (currentBranch === this.branch) {
      throw new Error(`Cannot run transaction while checked out to state branch ${this.branch}`);
    }

    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        try { await this.git.fetch(this.remote, this.branch); } catch (e) {}

        await this.git.checkout(this.branch);

        try { await this.git.pull(this.remote, this.branch, ['--rebase']); } catch (e) {}

        const statePath = path.join(this.projectRoot, 'state.json');
        let state = { version: 1, locks: [], requests: [], tasks: [] };
        if (fs.existsSync(statePath)) {
          state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        }

        const { changed, result, newState } = mutator(state);

        if (!changed) {
          await this.git.checkout(currentBranch);
          return result;
        }

        fs.writeFileSync(statePath, JSON.stringify(newState, null, 2));
        await this.git.add('state.json');
        await this.git.commit(`chore(ofa): update coordination state [skip ci]`);

        try {
          const hasRemoteCheck = await this.git.branch(['-r']);
          if (hasRemoteCheck.all.includes(`${this.remote}/${this.branch}`)) {
              await this.git.push(this.remote, this.branch);
          }
        } catch (e) {
          await this.git.reset(['--hard', 'HEAD~1']);
          await this.git.checkout(currentBranch);
          continue;
        }

        await this.git.checkout(currentBranch);
        return result;

      } catch (err) {
        await this.git.checkout(currentBranch).catch(() => {});
        throw err;
      }
    }

    throw new Error('Transaction failed after max retries due to concurrent modifications.');
  }

  async getState() {
    return this._transaction((state) => {
      const now = new Date();
      let changed = false;
      const newLocks = state.locks.filter(l => {
        if (new Date(l.expires_at) <= now) {
          changed = true;
          return false;
        }
        return true;
      });

      if (changed) state.locks = newLocks;

      return { changed, newState: state, result: state };
    });
  }

  async acquire(lease) {
    return this._transaction((state) => {
      const now = new Date();
      state.locks = state.locks.filter(l => new Date(l.expires_at) > now);
      const existing = state.locks.find(l => l.zone === lease.zone);

      if (existing) {
        if (existing.owner === lease.owner) {
          existing.expires_at = lease.expires_at;
          existing.nonce = crypto.randomUUID();
          return {
            changed: true,
            newState: state,
            result: { success: true, message: `TTL refreshed for zone "${lease.zone}"`, state }
          };
        } else {
          return {
            changed: false,
            newState: state,
            result: { success: false, message: `Zone "${lease.zone}" is already claimed by @${existing.owner}`, state }
          };
        }
      }

      const newLock = { ...lease, nonce: crypto.randomUUID(), claimed_at: new Date().toISOString() };
      state.locks.push(newLock);

      return {
        changed: true,
        newState: state,
        result: { success: true, message: `Zone "${lease.zone}" claimed successfully`, state }
      };
    });
  }

  async release(zone, owner, force = false) {
    return this._transaction((state) => {
      const existingIdx = state.locks.findIndex(l => l.zone === zone);

      if (existingIdx === -1) {
        return { changed: false, newState: state, result: { success: false, message: `Zone "${zone}" is not claimed by anyone`, state } };
      }

      const existing = state.locks[existingIdx];

      if (existing.owner !== owner && !force) {
        return { changed: false, newState: state, result: { success: false, message: `Zone "${zone}" is owned by @${existing.owner}, not @${owner}`, state } };
      }

      state.locks.splice(existingIdx, 1);

      return { changed: true, newState: state, result: { success: true, message: force ? `Zone force-released.` : `Zone released.`, state } };
    });
  }

  async requestAccess(request) {
    return this._transaction((state) => {
      request.id = crypto.randomUUID();
      request.status = 'pending';
      state.requests = state.requests || [];
      state.requests.push(request);
      return { changed: true, newState: state, result: { success: true, message: 'Request recorded.', state, request } };
    });
  }

  async approveRequest(requestId, approver) {
    return this._transaction((state) => {
      state.requests = state.requests || [];
      const req = state.requests.find(r => r.id === requestId);
      if (!req) {
        return { changed: false, newState: state, result: { success: false, message: 'Request not found.', state } };
      }
      req.status = 'approved';
      req.approved_by = approver;
      req.approved_at = new Date().toISOString();
      return { changed: true, newState: state, result: { success: true, message: 'Request approved.', state } };
    });
  }
}
