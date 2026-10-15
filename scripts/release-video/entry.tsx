import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Showcase, type ShowcaseProps } from './video.js';
import type { ZodObject } from 'zod';
registerRoot(()=><Composition<ZodObject,ShowcaseProps> id="ReleaseShowcase" component={Showcase} width={1280} height={720} fps={24} durationInFrames={1} defaultProps={{} as ShowcaseProps} calculateMetadata={({props})=>({durationInFrames:props.timeline.durationInFrames})}/>);
