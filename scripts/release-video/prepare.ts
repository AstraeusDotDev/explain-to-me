import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { productionManifestSchema, type ProductionManifest } from '../../packages/contracts/src/production-manifest.js';
import { prepareNarration } from '../../packages/audio/src/prepare-narration.js';
import { synthesizeNarration } from '../../packages/audio/src/synthesize.js';
import { buildTimeline, createSentenceCaptions, renderWebVtt } from '../../packages/timeline/src/timeline.js';

const output = resolve('out/release-showcase');
await mkdir(output, {recursive:true});
const source = productionManifestSchema.parse(JSON.parse(await readFile('scripts/release-video/story.json','utf8'))) as ProductionManifest;
const { manifest } = prepareNarration(source);
const audio = await synthesizeNarration({manifest,voice:'af_heart',backend:'kokoro',targetDurationMs:source.targetDurationMs,workDir:output});
const timeline = buildTimeline(manifest,audio.chunks);
await writeFile(`${output}/props.json`,JSON.stringify({manifest,timeline},null,2));
await writeFile(`${output}/audio-record.json`,JSON.stringify({pcmPath:audio.pcmPath,voice:audio.voice,backend:audio.backend,durationMs:audio.durationMs,attempts:audio.attempts},null,2));
await writeFile(`${output}/captions.vtt`,renderWebVtt(createSentenceCaptions(manifest,timeline)));
console.log(JSON.stringify({duration:timeline.durationMs/1000,frames:timeline.durationInFrames,pcm:audio.pcmPath}));
