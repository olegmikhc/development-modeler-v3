import {describe,it,expect} from 'vitest';
import {reconcileCloud} from './cloud-sync-state';
describe('three-way cloud reconciliation',()=>{
 it('loads models missing on this device',()=>expect(reconcileCloud(undefined,'remote')).toBe('download'));
 it('accepts identical snapshots',()=>expect(reconcileCloud('same','same')).toBe('equal'));
 it('downloads another editor changes only when local is unchanged',()=>expect(reconcileCloud('base','new','base')).toBe('download'));
 it('uploads offline local edits only when remote is unchanged',()=>expect(reconcileCloud('new','base','base')).toBe('upload'));
 it('retains both versions when edited concurrently',()=>expect(reconcileCloud('local','remote','base')).toBe('conflict'));
 it('does not guess which unknown version is newer',()=>expect(reconcileCloud('local','remote')).toBe('conflict'));
});
