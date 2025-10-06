import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { button, useControls } from "leva";
import React, { useEffect, useRef, useState } from "react";

import * as THREE from "three";
import { useSpeech } from "../hooks/useSpeech";
import facialExpressions from "../constants/facialExpressions";
import visemesMapping from "../constants/visemesMapping";
import morphTargets from "../constants/morphTargets";

const MODEL_PATH = "/models/avatar-female.glb";

export function Avatar(props) {
  const gltf = useGLTF(MODEL_PATH);
  const nodes = gltf?.nodes ?? {};
  const materials = gltf?.materials ?? {};
  const scene = gltf?.scene;
  const { animations } = useGLTF("/models/animations.glb");
  const { message, onMessagePlayed } = useSpeech();
  const [lipsync, setLipsync] = useState();
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    if (!message) {
      setAnimation("Idle");
      return;
    }
    setAnimation(message.animation);
    setFacialExpression(message.facialExpression);
    setLipsync(message.lipsync);
    const audio = new Audio("data:audio/mp3;base64," + message.audio);
    audio.play();
    setAudio(audio);
    audio.onended = onMessagePlayed;
  }, [message]);


  const group = useRef();
  const warningsRef = useRef({ nodes: new Set(), materials: new Set(), morphTargets: new Set() });
  const renderableWarningRef = useRef(false);
  const { actions, mixer } = useAnimations(animations, group);
  const [animation, setAnimation] = useState(animations.find((a) => a.name === "Idle") ? "Idle" : animations[0].name);
  useEffect(() => {
    if (actions[animation]) {
      actions[animation]
        .reset()
        .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
        .play();
      return () => {
        if (actions[animation]) {
          actions[animation].fadeOut(0.5);
        }
      };
    }
  }, [animation]);

  const safeLogWarning = (type, value, message) => {
    const cache = warningsRef.current[type];
    if (!cache.has(value)) {
      console.warn(message);
      cache.add(value);
    }
  };

  const getNode = (name) => {
    const node = nodes?.[name];
    if (!node) {
      safeLogWarning("nodes", name, `[Avatar] No se encontró el nodo "${name}" en ${MODEL_PATH}.`);
    }
    return node;
  };

  const getMaterial = (name) => {
    if (!name) {
      return undefined;
    }
    const material = materials?.[name];
    if (!material) {
      safeLogWarning("materials", name, `[Avatar] No se encontró el material "${name}" en ${MODEL_PATH}.`);
    }
    return material;
  };

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    if (!scene) {
      return;
    }
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (index === undefined || child.morphTargetInfluences[index] === undefined) {
          safeLogWarning(
            "morphTargets",
            target,
            `[Avatar] El morph target "${target}" no existe en el modelo. Se usará el valor predeterminado.`
          );
          return;
        }
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(child.morphTargetInfluences[index], value, speed);
      }
    });
  };

  const [blinkTarget, setBlinkTarget] = useState(0);
  const blinkStrength = useRef(0);
  const [facialExpression, setFacialExpression] = useState("");
  const [audio, setAudio] = useState();

  useFrame((state) => {
    !setupMode &&
      morphTargets.forEach((key) => {
        const mapping = facialExpressions[facialExpression];
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return; // eyes wink/blink are handled separately
        }
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      });

    blinkStrength.current = THREE.MathUtils.lerp(blinkStrength.current, blinkTarget, 0.2);
    lerpMorphTarget("eyeBlinkLeft", blinkStrength.current, 0.2);
    lerpMorphTarget("eyeBlinkRight", blinkStrength.current, 0.2);

    if (!setupMode) {
      const smileIntensity = ((Math.sin(state.clock.getElapsedTime() * 0.6) + 1) / 2) * 0.08;
      ["mouthSmileLeft", "mouthSmileRight"].forEach((key) => {
        const mapping = facialExpressions[facialExpression];
        if (mapping && mapping[key] !== undefined) {
          return;
        }
        lerpMorphTarget(key, smileIntensity, 0.05);
      });
    }

    if (setupMode) {
      return;
    }

    const appliedMorphTargets = [];
    if (message && lipsync) {
      const currentAudioTime = audio.currentTime;
      for (let i = 0; i < lipsync.mouthCues.length; i++) {
        const mouthCue = lipsync.mouthCues[i];
        if (currentAudioTime >= mouthCue.start && currentAudioTime <= mouthCue.end) {
          appliedMorphTargets.push(visemesMapping[mouthCue.value]);
          lerpMorphTarget(visemesMapping[mouthCue.value], 1, 0.2);
          break;
        }
      }
    }

    Object.values(visemesMapping).forEach((value) => {
      if (appliedMorphTargets.includes(value)) {
        return;
      }
      lerpMorphTarget(value, 0, 0.1);
    });
  });

  useControls("FacialExpressions", {
    animation: {
      value: animation,
      options: animations.map((a) => a.name),
      onChange: (value) => setAnimation(value),
    },
    facialExpression: {
      options: Object.keys(facialExpressions),
      onChange: (value) => setFacialExpression(value),
    },
    setupMode: button(() => {
      setSetupMode(!setupMode);
    }),
    logMorphTargetValues: button(() => {
      const emotionValues = {};
      Object.values(nodes).forEach((node) => {
        if (node.morphTargetInfluences && node.morphTargetDictionary) {
          morphTargets.forEach((key) => {
            if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
              return;
            }
            const value = node.morphTargetInfluences[node.morphTargetDictionary[key]];
            if (value > 0.01) {
              emotionValues[key] = value;
            }
          });
        }
      });
      console.log(JSON.stringify(emotionValues, null, 2));
    }),
  });

  useControls("MorphTarget", () =>
    Object.assign(
      {},
      ...morphTargets.map((key) => {
        return {
          [key]: {
            label: key,
            value: 0,
            min: 0,
            max: 1,
            onChange: (val) => {
              lerpMorphTarget(key, val, 0.1);
            },
          },
        };
      })
    )
  );

  useEffect(() => {
    let blinkTimeout;
    let resetTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlinkTarget(1);
        resetTimeout = setTimeout(() => {
          setBlinkTarget(0);
          nextBlink();
        }, 140);
      }, THREE.MathUtils.randInt(1800, 4200));
    };
    nextBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(resetTimeout);
    };
  }, []);

  const hasRenderableMeshes = React.useMemo(() => {
    const nodeValues = Object.values(nodes ?? {});
    if (!nodeValues.length || !scene) {
      return false;
    }
    const hasSkinnedMesh = nodeValues.some((node) => node?.isSkinnedMesh || node?.type === "SkinnedMesh");
    return Boolean(nodes?.Hips && hasSkinnedMesh);
  }, [nodes, scene]);

  useEffect(() => {
    if (!hasRenderableMeshes && scene && !renderableWarningRef.current) {
      console.warn(`[Avatar] No se encontraron mallas renderizables en ${MODEL_PATH}.`);
      renderableWarningRef.current = true;
    }
  }, [hasRenderableMeshes, scene]);

  const renderSkinnedMesh = (nodeName, materialName) => {
    const node = getNode(nodeName);
    if (!node) {
      return null;
    }
    const material = getMaterial(materialName) ?? node.material ?? undefined;
    return (
      <skinnedMesh
        key={nodeName}
        name={nodeName}
        geometry={node.geometry}
        material={material}
        skeleton={node.skeleton}
        morphTargetDictionary={node.morphTargetDictionary}
        morphTargetInfluences={node.morphTargetInfluences}
      />
    );
  };

  const hipsNode = getNode("Hips");

  return (
    <group {...props} dispose={null} ref={group} position={[0, -0.5, 0]}>
      {!hasRenderableMeshes && (
        <Html center>
          <div
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              color: "#ffffff",
              padding: "1rem 1.5rem",
              borderRadius: "0.75rem",
              maxWidth: "18rem",
              fontSize: "1rem",
              textAlign: "center",
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.35)",
            }}
          >
            No se pudo cargar el avatar. Revisa la consola para más detalles.
          </div>
        </Html>
      )}
      {hipsNode ? <primitive object={hipsNode} /> : null}
      {renderSkinnedMesh("EyeLeft", "Wolf3D_Eye")}
      {renderSkinnedMesh("EyeRight", "Wolf3D_Eye")}
      {renderSkinnedMesh("Wolf3D_Head", "Wolf3D_Skin")}
      {renderSkinnedMesh("Wolf3D_Teeth", "Wolf3D_Teeth")}
      {renderSkinnedMesh("Wolf3D_Eyelashes", "Wolf3D_Eyelash")}
      {renderSkinnedMesh("Wolf3D_Eyebrows", "Wolf3D_Eyebrow")}
      {renderSkinnedMesh("Wolf3D_Hair", "Wolf3D_Hair")}
      {renderSkinnedMesh("Wolf3D_Glasses", "Wolf3D_Glasses")}
      {renderSkinnedMesh("Wolf3D_Headwear", "Wolf3D_Headwear")}
      {renderSkinnedMesh("Wolf3D_Body", "Wolf3D_Body")}
      {renderSkinnedMesh("Wolf3D_Outfit_Bottom", "Wolf3D_Outfit_Bottom")}
      {renderSkinnedMesh("Wolf3D_Outfit_Footwear", "Wolf3D_Outfit_Footwear")}
      {renderSkinnedMesh("Wolf3D_Outfit_Top", "Wolf3D_Outfit_Top")}
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
