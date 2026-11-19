'use client';
import {useState} from 'react';
import {ModelsHome} from '@/features/models/models-home';
import {useCloudAutosave} from '@/features/models/use-cloud-autosave';
import {appPath} from '@/lib/app-path';
export default function Login(){
 useCloudAutosave();const [message,setMessage]=useState('');
 return <><ModelsHome accountInitiallyOpen notify={setMessage} onOpen={id=>window.location.assign(appPath('/')+'?open='+encodeURIComponent(id))}/>{message&&<div role="status" className="notice v3-library-notice">{message}</div>}</>;
}
