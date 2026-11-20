// Isolated review build. No production route, API, auth or provider binding.
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
if(!process.env.ECC_COMMAND_REVIEW_OUT)throw new Error('An isolated review output directory is required');
export default defineConfig({root:path.resolve('tests/browser/command-center-review'),publicDir:path.resolve('public'),plugins:[react()],resolve:{alias:{'@':path.resolve('src')}},build:{outDir:process.env.ECC_COMMAND_REVIEW_OUT,emptyOutDir:true},server:{host:'0.0.0.0',port:4181,strictPort:true},preview:{host:'0.0.0.0',port:4181,strictPort:true}});
