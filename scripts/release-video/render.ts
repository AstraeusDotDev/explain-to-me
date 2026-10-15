import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia, renderStill } from '@remotion/renderer';

const inputProps=JSON.parse(await readFile('out/release-showcase/props.json','utf8'));
const platform=process.platform==='darwin'?`mac-${process.arch}`:process.platform==='linux'?(process.arch==='arm64'?'linux-arm64':'linux64'):'win64';
const executable=process.platform==='win32'?'chrome-headless-shell.exe':'chrome-headless-shell';
const browserExecutable=process.env.CHROME_PATH??resolve(`node_modules/.remotion/chrome-headless-shell/${platform}/chrome-headless-shell-${platform}/${executable}`);
const serveUrl=await bundle({entryPoint:resolve('scripts/release-video/entry.tsx'),webpackOverride:(config)=>({...config,resolve:{...config.resolve,extensionAlias:{...config.resolve?.extensionAlias,'.js':['.ts','.tsx','.js']}}})});
const composition=await selectComposition({serveUrl,id:'ReleaseShowcase',inputProps,browserExecutable,chromeMode:'headless-shell'});
if(process.argv.includes('--stills')) {
  for (const [index,scene] of inputProps.timeline.scenes.entries()) {
    await renderStill({serveUrl,composition,inputProps,browserExecutable,chromeMode:'headless-shell',frame:scene.from+Math.min(90,scene.durationInFrames-1),output:resolve(`out/release-showcase/scene-${index+1}.png`)});
  }
} else {
  let previous=-1;
  await renderMedia({serveUrl,composition,inputProps,browserExecutable,chromeMode:'headless-shell',codec:'h264',crf:19,concurrency:4,outputLocation:resolve('out/release-showcase/silent.mp4'),onProgress:({progress})=>{const percent=Math.floor(progress*10)*10;if(percent>previous){console.log(`${percent}%`);previous=percent;}}});
}
