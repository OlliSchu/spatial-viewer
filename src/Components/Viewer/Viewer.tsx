/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { memo, useContext, useEffect, useState } from "react";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as BVH from "three-mesh-bvh";
import {
  ClickMode,
  ViewerContext,
  ViewerContextType,
} from "../Core/Context/ViewerContext";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer";
import { Color } from "three";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";

// based on: https://github.com/mrdoob/three.js/blob/master/examples/misc_controls_transform.html
// example: https://observablehq.com/@vicapow/three-js-transformcontrols-example

export const ViewerComponent = memo(() => {
  // Setting up state vars
  const [cameraPersp, setCameraPersp] = useState<THREE.PerspectiveCamera>();
  const [cameraOrtho, setCameraOrtho] = useState<THREE.OrthographicCamera>();
  const [selectionBox, setSelectionBox] = useState<THREE.Box3Helper>();

  const {
    scene,
    clickMode,
    setClickMode,
    setScene,
    renderer,
    setRenderer,
    currentCamera,
    setCurrentCamera,
    reRenderViewer,
    control,
    setControl,
    orbit,
    setOrbit,
    addTransformToMesh,
    detachControls,
    setComposer,
    setOutlinePass,
    setClipHelper,
    clipPlanes,
  } = useContext(ViewerContext) as ViewerContextType;

  // Setting up raycaster & mouse
  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true;
  const mouse = new THREE.Vector2();

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.top = "0px";
  labelRenderer.domElement.style.pointerEvents = "none";
  document.body.appendChild(labelRenderer.domElement);

  // Init Effect
  useEffect(() => {
    const canvas = document.getElementById("ifc-viewer-container");
    const width: number = canvas.clientWidth;
    const height: number = canvas.clientHeight;
    const tRenderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    tRenderer.setSize(width, height);
    tRenderer.setClearColor(0x000000, 0);
    tRenderer.shadowMap.enabled = true;
    tRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document
      .getElementById("ifc-viewer-container")
      .replaceChildren(tRenderer.domElement);
    // .appendChild(tRenderer.domElement);
    const aspect: number = width / height;

    // Adding Cameras
    const tCameraPersp = new THREE.PerspectiveCamera(50, aspect, 0.01, 30000);
    const tCameraOrtho = new THREE.OrthographicCamera(
      -600 * aspect,
      600 * aspect,
      -600,
      0.01,
      30000
    );
    const tCurrentCamera = tCameraPersp;

    tCurrentCamera.position.set(2, 2, 2);
    tCurrentCamera.lookAt(0, 2, 0);

    const tScene = new THREE.Scene();

    tScene.add(new THREE.GridHelper(100, 100, 0x888888, 0x444444));

    const axesHelper = new THREE.AxesHelper(5);

    tScene.add(new THREE.HemisphereLight(0xffffff, 0xd9d9d9, 1));
    tScene.add(axesHelper);

    // Adding Orbit Controls
    const tOrbit = new OrbitControls(tCurrentCamera, tRenderer.domElement);
    tOrbit.update();
    tOrbit.addEventListener("change", () => {
      tRenderer.render(tScene, tCurrentCamera);
      labelRenderer.render(tScene, tCurrentCamera);
      setClickMode(ClickMode.Orbit);
    });
    tOrbit.addEventListener("end", () => {
      setClickMode(ClickMode.Select);
    });

    // Adding a initial dummy control

    let tClipHelper = new THREE.PlaneHelper(clipPlanes[0], 10);
    tClipHelper.visible = false;
    tScene.add(tClipHelper);
    setClipHelper(tClipHelper);

    const tControl = new TransformControls(
      tCurrentCamera,
      tRenderer.domElement
    );

    // Initial rerender. Later use the function
    tRenderer.render(tScene, tCurrentCamera);

    // Set Up Composer

    const tComposer = new EffectComposer(tRenderer);
    const tRenderPass = new RenderPass(tScene, tCurrentCamera);
    tComposer.addPass(tRenderPass);
    const tOutlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      tScene,
      tCurrentCamera
    );
    tOutlinePass.edgeStrength = 10;
    tOutlinePass.edgeThickness = 3;
    tOutlinePass.visibleEdgeColor.set(0xe47200);
    tOutlinePass.hiddenEdgeColor.set("#190a05");
    tComposer.addPass(tOutlinePass);

    const effectFXAA = new ShaderPass(FXAAShader);
    effectFXAA.uniforms["resolution"].value.set(1 / width, 1 / height);
    tComposer.addPass(effectFXAA);

    // Setting the state variables. ToDo: replace with ViewerContext
    setCameraOrtho(tCameraOrtho);
    setCameraPersp(tCameraPersp);
    setCurrentCamera(tCurrentCamera);
    setRenderer(tRenderer);
    setScene(tScene);
    setControl(tControl);
    setOrbit(tOrbit);
    setComposer(tComposer);
    setOutlinePass(tOutlinePass);
  }, []);

  // Init the resizer function listener
  useEffect(() => {
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, [cameraOrtho, cameraPersp, currentCamera, scene]);

  // Init the click function listener
  useEffect(() => {
    let tCanvas: HTMLCanvasElement;
    if (renderer) {
      tCanvas = renderer.domElement;
      tCanvas.addEventListener("click", onClick, false);
      tCanvas.addEventListener("mousemove", onMouseMove);
    }
    return () => {
      if (renderer) {
        tCanvas.removeEventListener("click", onClick);
        tCanvas.removeEventListener("mousemove", onMouseMove);
      }
    };
  }, [control, clickMode]);

  function onClick(event) {
    if (currentCamera) {
      if (clickMode === ClickMode.Select) {
        const canvas = event.target;
        const x = (event.offsetX / canvas.clientWidth) * 2 - 1;
        const y = -(event.offsetY / canvas.clientHeight) * 2 + 1;

        // Places it on the camera pointing to the mouse
        raycaster.setFromCamera({ x, y }, currentCamera);

        // Casts a ray
        const intersection = raycaster.intersectObjects(
          scene.children.filter(
            (obj) => obj.type === "Mesh" || obj.type === "Points"
          )
        );

        // Filter out ControlPlane if it is hit
        if (intersection.length > 0) {
          let currentPos = new THREE.Vector3();
          const firstInt = intersection[0].object;
          firstInt.getWorldPosition(currentPos);
          addTransformToMesh(firstInt);

          // create a BoxHelper around the selected object
          if (firstInt instanceof THREE.Mesh) {
            const box = new THREE.Box3().setFromBufferAttribute(
              firstInt.geometry.attributes.position
            );
            box.expandByScalar(5);
            let pos = new THREE.Vector3();
            let scale = new THREE.Vector3(1, 1, 1);
            let quat = new THREE.Quaternion();
            let matrix = new THREE.Matrix4().compose(pos, quat, scale);
            if (selectionBox) {
              selectionBox.box.makeEmpty();
              selectionBox.box = box;
              selectionBox.visible = true;
              selectionBox.uuid = "three_spatial_viewer_selectionBox";
              selectionBox.matrix = matrix;
              firstInt.add(selectionBox);
            } else {
              const box3Helper = new THREE.Box3Helper(
                box,
                new THREE.Color(0xe42300)
              );
              box3Helper.visible = true;
              box3Helper.uuid = "three_spatial_viewer_selectionBox";
              box3Helper.matrix = matrix;
              //@ts-ignore
              box3Helper.material.linewidth = 5;
              firstInt.add(box3Helper);
              setSelectionBox(box3Helper);
            }

            reRenderViewer();
          }
        } else {
          if (control) {
            if (selectionBox) {
              selectionBox.visible = false;
            }
            detachControls(true);
          }
        }
      }
      if (clickMode === ClickMode.Measure) {
      }
    }
  }

  function onMouseMove(event) {
    if (clickMode === ClickMode.Measure && orbit.enabled === false) {
    } else if (clickMode === ClickMode.Select) {
    }
  }

  function onWindowResize() {
    const canvas = document.getElementById("ifc-viewer-container");
    const width: number = canvas.clientWidth;
    const height: number = canvas.clientHeight;
    const aspect: number = width / height;
    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);

    cameraOrtho.left = cameraOrtho.bottom * aspect;
    cameraOrtho.right = cameraOrtho.top * aspect;
    cameraOrtho.updateProjectionMatrix();

    renderer.setSize(width, height);

    reRenderViewer();
  }

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
      }}
      id="ifc-viewer-container"
    ></div>
  );
});
