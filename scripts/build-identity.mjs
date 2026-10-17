import { execFileSync } from 'node:child_process';

export function readBuildIdentity(run = execFileSync) {
  try {
    const commitSha = run('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = run('git', ['status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8' }).trim() !== '';
    if (!/^[a-f0-9]{40}$/.test(commitSha)) throw new Error('Unknown revision');
    return { repository: 'Altus-Realty-Group/ECC-APM', commitSha, dirtyBuild: dirty };
  } catch { return { repository: 'Altus-Realty-Group/ECC-APM', commitSha: null, dirtyBuild: true }; }
}

export function buildIdentityPlugin() {
  return { name: 'ecc-build-identity', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'ecc-build-identity.json', source: JSON.stringify(readBuildIdentity()) });
  } };
}
