import React from "react";
import { Composition, registerRoot } from "remotion";
import type { ZodObject } from "zod";
import { Video, type VideoProps } from "./video.js";

const Root: React.FC = () => (
  <Composition<ZodObject, VideoProps>
    id="ExplainToMe"
    component={Video}
    width={1280}
    height={720}
    fps={24}
    durationInFrames={1}
    defaultProps={{} as VideoProps}
    calculateMetadata={({ props }) => ({
      width: props.width ?? 1280,
      height: props.height ?? 720,
      fps: props.fps ?? props.timeline.fps,
      durationInFrames: props.timeline.durationInFrames,
    })}
  />
);

registerRoot(Root);
