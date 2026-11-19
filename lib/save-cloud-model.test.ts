import {beforeEach,it,expect,vi} from 'vitest';
import {demoModel} from './demo';
import {stableJSON} from './stable-json';
import {useCloudState} from './cloud-sync-state';
const mock=vi.hoisted(()=>({sync:vi.fn(),rpc:vi.fn(),insert:vi.fn(),eq:vi.fn(),read:vi.fn(),auth:vi.fn()}));
vi.mock('./supabase',()=>({syncModel:mock.sync,supabase:()=>({auth:{getUser:mock.auth},rpc:mock.rpc,from:(table:string)=>table==='financial_models'?{select:()=>({eq:(...args:unknown[])=>{mock.eq(...args);return {maybeSingle:mock.read}}})}:table==='model_versions'?{insert:mock.insert}:{select:()=>({eq:()=>({eq:()=>({limit:async()=>({data:[{organization_id:'org'}]})})})})}})}));
import {saveCloudModel} from './save-cloud-model';
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('window',{dispatchEvent:vi.fn()});mock.auth.mockResolvedValue({data:{user:{id:'user',email_confirmed_at:'yes'}}});mock.insert.mockResolvedValue({});mock.sync.mockResolvedValue(8);useCloudState.setState({bases:{},statuses:{}});});
it('saves edits against the known revision and records the acknowledged snapshot',async()=>{
 const model=demoModel(),previous={...model,name:'Previous'};
 mock.read.mockResolvedValue({data:{data:previous,revision:7,organization_id:'org'}});
 useCloudState.getState().remember(model.id,{userId:'user',revision:7,org:'org',snapshot:stableJSON(previous)});
 await saveCloudModel(model);
 expect(mock.sync).toHaveBeenLastCalledWith(model,'org',7,'user');
 expect(useCloudState.getState().bases[model.id].revision).toBe(8);
});
it('rejects stale writes without backing up or overwriting the newer version',async()=>{
 const model=demoModel();mock.read.mockResolvedValue({data:{data:{...model,name:'Remote edit'},revision:9,organization_id:'org'}});
 useCloudState.getState().remember(model.id,{userId:'user',revision:7,org:'org',snapshot:stableJSON(model)});
 await expect(saveCloudModel(model)).rejects.toThrow('Конфликт');expect(mock.sync).not.toHaveBeenCalled();expect(mock.insert).not.toHaveBeenCalled();
});
it('does not overwrite an unknown cloud version',async()=>{const model=demoModel();mock.read.mockResolvedValue({data:{data:{...model,name:'Other'},revision:1,organization_id:'org'}});await expect(saveCloudModel(model)).rejects.toThrow('Конфликт');expect(mock.sync).not.toHaveBeenCalled();});
it('does not recreate a previously synced model when access is revoked',async()=>{const model=demoModel();useCloudState.getState().remember(model.id,{userId:'user',revision:1,org:'org',snapshot:stableJSON(model)});mock.read.mockResolvedValue({data:null});await expect(saveCloudModel(model)).rejects.toThrow('недоступна');expect(mock.sync).not.toHaveBeenCalled();});
it('creates a new model in the signed-in owner workspace',async()=>{const model=demoModel();mock.read.mockResolvedValue({data:null});await saveCloudModel(model);expect(mock.sync).toHaveBeenCalledWith(model,'org',0,'user');});
it('stops when the previous cloud version cannot be backed up',async()=>{const model=demoModel(),previous={...model,name:'Old'};mock.read.mockResolvedValue({data:{data:previous,revision:1,organization_id:'org'}});useCloudState.getState().remember(model.id,{userId:'user',revision:1,org:'org',snapshot:stableJSON(previous)});mock.insert.mockResolvedValue({error:Error('Backup failed')});await expect(saveCloudModel(model)).rejects.toThrow('Backup failed');expect(mock.sync).not.toHaveBeenCalled();});
it('does not upload a previous account model into the new account',async()=>{const model=demoModel();mock.read.mockResolvedValue({data:null});useCloudState.getState().remember(model.id,{userId:'other',revision:1,org:'other-org',snapshot:stableJSON(model)});await expect(saveCloudModel(model)).rejects.toThrow('другим аккаунтом');expect(mock.sync).not.toHaveBeenCalled();});
