import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DigitalTwinDefectOverlay } from '../../types';
import { RefreshCw, Sparkles } from 'lucide-react';

export type RenderMode = 'REALISTIC' | 'WIREFRAME' | 'STRESS' | 'HEATMAP' | 'XRAY_GHOST';

export interface CameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'OVERVIEW', label: 'Isometric Overview', position: [160, 110, 210], target: [0, 35, 0] },
  { id: 'UPSTREAM', label: 'Upstream Reservoir', position: [0, 95, -190], target: [0, 50, 0] },
  { id: 'CREST', label: 'Crest Road Deck', position: [-130, 90, 20], target: [0, 80, 0] },
  { id: 'SPILLWAY', label: 'Spillway Chute', position: [20, 45, 140], target: [0, 40, 0] },
];

export interface MeasurePoint {
  x: number;
  y: number;
  z: number;
}

interface DigitalTwinViewerProps {
  modelUrl: string | null;
  defects: DigitalTwinDefectOverlay[];
  selectedDefectId?: number | null;
  onSelectDefect: (defect: DigitalTwinDefectOverlay) => void;
  showDefects?: boolean;
  activePreset?: string;
  renderMode?: RenderMode;
  damName?: string;
  isMeasuringMode?: boolean;
  measurementPoints?: MeasurePoint[];
  onAddMeasurementPoint?: (pt: MeasurePoint) => void;
  clippingAxis?: 'NONE' | 'X' | 'Y' | 'Z';
  clippingOffset?: number;
  severityFilter?: string;
}

export const DigitalTwinViewer: React.FC<DigitalTwinViewerProps> = ({
  modelUrl,
  defects,
  selectedDefectId,
  onSelectDefect,
  showDefects = true,
  activePreset = 'OVERVIEW',
  renderMode = 'REALISTIC',
  damName = 'Hydroelectric Dam',
  isMeasuringMode = false,
  measurementPoints = [],
  onAddMeasurementPoint,
  clippingAxis = 'NONE',
  clippingOffset = 0,
  severityFilter = 'ALL',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingText, setLoadingText] = useState<string>('Initializing 3D Twin Engine...');
  const [hoveredDefect, setHoveredDefect] = useState<DigitalTwinDefectOverlay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const markerMeshesRef = useRef<{ mesh: THREE.Mesh; defect: DigitalTwinDefectOverlay }[]>([]);
  const damMeshesRef = useRef<THREE.Mesh[]>([]);
  const waterMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const waterTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const sprayParticlesRef = useRef<THREE.Points | null>(null);

  // Target camera position animation
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);
  const measurementGroupRef = useRef<THREE.Group | null>(null);

  // --------------------------------------------------------------------------
  // PROCEDURAL CANVAS TEXTURE GENERATOR FOR REALISTIC CONCRETE & WATER
  // --------------------------------------------------------------------------
  const generateConcreteTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base concrete grey
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 512, 512);

    // Fine aggregate noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Formwork horizontal construction joint lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 3;
    for (let y = 64; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 4);
    return texture;
  };

  const generateWaterTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#38bdf8';
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 4 + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    return texture;
  };

  // --------------------------------------------------------------------------
  // PROCEDURAL HIGH-DETAIL REALISTIC DAM BUILDER
  // --------------------------------------------------------------------------
  const buildProceduralRealisticDam = (scene: THREE.Scene) => {
    const concreteTexture = generateConcreteTexture();
    const waterTexture = generateWaterTexture();
    waterTextureRef.current = waterTexture;

    const concreteMat = new THREE.MeshStandardMaterial({
      map: concreteTexture,
      roughness: 0.7,
      metalness: 0.1,
      bumpMap: concreteTexture,
      bumpScale: 0.4,
    });

    const darkConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      metalness: 0.2,
    });

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.2,
    });

    const damGroup = new THREE.Group();

    // 1. Main Concrete Gravity Dam Monolith Body
    const damHeight = 85;
    const damLength = 320;
    const crestWidth = 14;
    const baseWidth = 70;

    const shape = new THREE.Shape();
    shape.moveTo(-crestWidth / 2, damHeight);
    shape.lineTo(crestWidth / 2, damHeight);
    shape.lineTo(baseWidth - crestWidth / 2, 0);
    shape.lineTo(-crestWidth / 2, 0);
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: damLength,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 1,
      bevelSegments: 2,
    };

    const damGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    damGeo.computeVertexNormals();
    damGeo.center();

    const damMesh = new THREE.Mesh(damGeo, concreteMat);
    damMesh.rotation.y = Math.PI / 2;
    damMesh.position.y = damHeight / 2;
    damMesh.castShadow = true;
    damMesh.receiveShadow = true;
    damGroup.add(damMesh);
    damMeshesRef.current.push(damMesh);

    // 2. Crest Roadway Deck & Safety Barriers
    const roadGeo = new THREE.BoxGeometry(damLength + 4, 1.5, crestWidth + 2);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(0, damHeight + 0.75, 0);
    roadMesh.receiveShadow = true;
    damGroup.add(roadMesh);

    // Parapet safety railings
    const railingGeo = new THREE.BoxGeometry(damLength, 2.5, 0.8);
    const railingUp = new THREE.Mesh(railingGeo, darkConcreteMat);
    railingUp.position.set(0, damHeight + 2, -crestWidth / 2 - 0.4);
    const railingDown = new THREE.Mesh(railingGeo, darkConcreteMat);
    railingDown.position.set(0, damHeight + 2, crestWidth / 2 + 0.4);
    damGroup.add(railingUp);
    damGroup.add(railingDown);

    // 3. Central Spillway Bays & Radial Piers
    const spillwayCount = 5;
    const bayWidth = 16;
    const pierWidth = 3.5;
    const startX = -((spillwayCount * (bayWidth + pierWidth)) / 2);

    for (let i = 0; i <= spillwayCount; i++) {
      const px = startX + i * (bayWidth + pierWidth);
      const pierGeo = new THREE.BoxGeometry(pierWidth, 12, crestWidth + 8);
      const pierMesh = new THREE.Mesh(pierGeo, darkConcreteMat);
      pierMesh.position.set(px, damHeight + 6, 0);
      pierMesh.castShadow = true;
      damGroup.add(pierMesh);

      // Radial steel gate cylinder segment between piers
      if (i < spillwayCount) {
        const gateGeo = new THREE.CylinderGeometry(
          bayWidth / 2,
          bayWidth / 2,
          10,
          16,
          1,
          false,
          0,
          Math.PI
        );
        const gateMesh = new THREE.Mesh(gateGeo, metalMat);
        gateMesh.rotation.z = Math.PI / 2;
        gateMesh.position.set(px + bayWidth / 2 + pierWidth / 2, damHeight - 2, -crestWidth / 2);
        damGroup.add(gateMesh);
      }
    }

    // 4. Animated Reservoir Water Plane
    const waterGeo = new THREE.PlaneGeometry(500, 300, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      map: waterTexture,
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.7,
      transparent: true,
      opacity: 0.85,
    });
    waterMaterialRef.current = waterMat;

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, 72, -150);
    waterMesh.receiveShadow = true;
    damGroup.add(waterMesh);

    // 5. Downstream Stilling Basin & River Bed
    const basinGeo = new THREE.PlaneGeometry(500, 200);
    const basinMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
    });
    const basinMesh = new THREE.Mesh(basinGeo, basinMat);
    basinMesh.rotation.x = -Math.PI / 2;
    basinMesh.position.set(0, 0, 100);
    basinMesh.receiveShadow = true;
    damGroup.add(basinMesh);

    // 6. Mountain Canyon Abutment Terrains (Left & Right)
    const createCanyonAbutment = (isLeft: boolean) => {
      const canyonGeo = new THREE.ConeGeometry(180, 140, 6);
      const canyonMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.95,
        metalness: 0.1,
        flatShading: true,
      });
      const canyon = new THREE.Mesh(canyonGeo, canyonMat);
      const sign = isLeft ? -1 : 1;
      canyon.position.set(sign * (damLength / 2 + 70), 50, 0);
      canyon.scale.set(1, 1, 1.6);
      canyon.castShadow = true;
      canyon.receiveShadow = true;
      return canyon;
    };
    damGroup.add(createCanyonAbutment(true));
    damGroup.add(createCanyonAbutment(false));

    // 7. Water Discharge Mist Particle System at Spillway Base
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount; p++) {
      particlePositions[p * 3] = (Math.random() - 0.5) * 80;
      particlePositions[p * 3 + 1] = Math.random() * 15;
      particlePositions[p * 3 + 2] = 35 + Math.random() * 30;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 3.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    sprayParticlesRef.current = particles;
    damGroup.add(particles);

    scene.add(damGroup);
  };

  // --------------------------------------------------------------------------
  // THREE.JS INITIALIZATION & SCENE SETUP
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    setLoading(true);
    setLoadingText('Initializing Three.js WebGL Renderer & Lighting...');

    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 650;

    // 1. Scene setup with atmospheric fog & deep navy background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.FogExp2(0x090d16, 0.0018);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 3000);
    const initialPreset = CAMERA_PRESETS.find((p) => p.id === activePreset) || CAMERA_PRESETS[0];
    camera.position.set(...initialPreset.position);
    cameraRef.current = camera;

    // 3. WebGL Renderer with Soft Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.target.set(...initialPreset.target);
    controlsRef.current = controls;

    // 5. Environmental Lighting (Sun + Sky Hemisphere + Ambient)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.6);
    hemiLight.position.set(0, 300, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    sunLight.position.set(180, 220, 120);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 800;
    const shadowDist = 220;
    sunLight.shadow.camera.left = -shadowDist;
    sunLight.shadow.camera.right = shadowDist;
    sunLight.shadow.camera.top = shadowDist;
    sunLight.shadow.camera.bottom = -shadowDist;
    sunLight.shadow.bias = -0.0001;
    scene.add(sunLight);

    // Grid Floor Helper
    const gridHelper = new THREE.GridHelper(600, 60, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.2;
    scene.add(gridHelper);

    const markersGroup = new THREE.Group();
    scene.add(markersGroup);

    // 6. MODEL LOADING (Binary GLB or Realistic Procedural Fallback)
    let isCancelled = false;

    const loadOrBuildModel = async () => {
      // 1. Always build environmental realistic surroundings (mountain canyons, animated reservoir, riverbed, spray mist)
      buildProceduralRealisticDam(scene);

      if (modelUrl) {
        try {
          setLoadingText('Downloading Binary 3D Asset...');
          const token = localStorage.getItem('hydrovision_token');
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const response = await fetch(modelUrl, { headers });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const arrayBuffer = await response.arrayBuffer();
          if (isCancelled) return;

          setLoadingText('Parsing GLTF Mesh & Computing Normals...');
          const loader = new GLTFLoader();
          loader.parse(
            arrayBuffer,
            '',
            (gltf) => {
              if (isCancelled) return;
              const model = gltf.scene;

              // Ensure all meshes have vertex normals, shadows & PBR material properties
              model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const m = child as THREE.Mesh;
                  m.geometry.computeVertexNormals();
                  m.castShadow = true;
                  m.receiveShadow = true;
                  damMeshesRef.current.push(m);
                }
              });

              // Fit and position loaded model inside photorealistic dam environment
              const box = new THREE.Box3().setFromObject(model);
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z) || 100;

              scene.add(model);

              renderDefectMarkers(markersGroup, maxDim);
              setLoading(false);
            },
            () => {
              // Parse error fallback
              renderDefectMarkers(markersGroup, 100);
              setLoading(false);
            }
          );
          return;
        } catch (err) {
          console.warn('[DigitalTwinViewer] GLB fetch note, using Photorealistic Engine.', err);
        }
      }

      renderDefectMarkers(markersGroup, 100);
      setLoading(false);
    };

  // Helper to render glowing 3D defect pins
  const renderDefectMarkers = (group: THREE.Group, maxDim: number) => {
    markerMeshesRef.current = [];
    group.clear();

    if (!showDefects || defects.length === 0) return;

    const filteredDefects = defects.filter((d) => {
      if (!severityFilter || severityFilter === 'ALL') return true;
      return d.severity === severityFilter;
    });

    filteredDefects.forEach((d) => {
      if (!d.position_available) return;

      const radius = Math.max(maxDim * 0.02, 1.4);
      const geo = new THREE.SphereGeometry(radius, 24, 24);

      let colorHex = 0x2563eb;
      if (d.severity === 'CRITICAL') colorHex = 0xef4444;
      else if (d.severity === 'HIGH') colorHex = 0xf59e0b;
      else if (d.severity === 'LOW') colorHex = 0x10b981;

      const isSelected = d.defect_id === selectedDefectId;

      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.2,
        metalness: 0.3,
        emissive: colorHex,
        emissiveIntensity: isSelected ? 0.9 : 0.45,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(d.position_3d.x, d.position_3d.y + radius, d.position_3d.z);
      mesh.castShadow = true;

      // Ground indicator stem line
      const lineMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.6 });
      const linePoints = [
        new THREE.Vector3(d.position_3d.x, 0, d.position_3d.z),
        new THREE.Vector3(d.position_3d.x, d.position_3d.y + radius, d.position_3d.z),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const line = new THREE.Line(lineGeo, lineMat);

      group.add(mesh);
      group.add(line);
      markerMeshesRef.current.push({ mesh, defect: d });
    });
  };

  // Render 3D measurement points & vector line
  const renderMeasurementLine = (scene: THREE.Scene) => {
    if (!measurementGroupRef.current) {
      const g = new THREE.Group();
      scene.add(g);
      measurementGroupRef.current = g;
    }
    const group = measurementGroupRef.current;
    group.clear();

    if (!measurementPoints || measurementPoints.length === 0) return;

    // Render spheres at points
    const pointMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const pointGeo = new THREE.SphereGeometry(1.8, 16, 16);

    measurementPoints.forEach((p) => {
      const m = new THREE.Mesh(pointGeo, pointMat);
      m.position.set(p.x, p.y, p.z);
      group.add(m);
    });

    if (measurementPoints.length >= 2) {
      const p1 = new THREE.Vector3(measurementPoints[0].x, measurementPoints[0].y, measurementPoints[0].z);
      const p2 = new THREE.Vector3(measurementPoints[1].x, measurementPoints[1].y, measurementPoints[1].z);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 2,
        gapSize: 1,
        linewidth: 3,
      });
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      group.add(line);
    }
  };

    loadOrBuildModel();

    // 7. Raycaster for Hover & Click interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });

      raycaster.setFromCamera(mouse, camera);
      const meshesToTest = markerMeshesRef.current.map((m) => m.mesh);
      const intersects = raycaster.intersectObjects(meshesToTest);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const matched = markerMeshesRef.current.find((m) => m.mesh === hitMesh);
        if (matched) {
          setHoveredDefect(matched.defect);
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredDefect(null);
      renderer.domElement.style.cursor = 'default';
    };

    const handlePointerClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (isMeasuringMode && onAddMeasurementPoint) {
        const intersectsDam = raycaster.intersectObjects(damMeshesRef.current);
        if (intersectsDam.length > 0) {
          const pt = intersectsDam[0].point;
          onAddMeasurementPoint({ x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10, z: Math.round(pt.z * 10) / 10 });
          return;
        }
      }

      const meshesToTest = markerMeshesRef.current.map((m) => m.mesh);
      const intersects = raycaster.intersectObjects(meshesToTest);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const matched = markerMeshesRef.current.find((m) => m.mesh === hitMesh);
        if (matched) {
          onSelectDefect(matched.defect);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handlePointerClick);

    // 8. Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 9. Main Render Loop with Animations
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      controls.update();

      if (sceneRef.current) {
        renderMeasurementLine(sceneRef.current);
      }

      // Animate water surface offset
      if (waterTextureRef.current) {
        waterTextureRef.current.offset.x += 0.0006;
        waterTextureRef.current.offset.y += 0.0003;
      }

      // Animate spray mist particles
      if (sprayParticlesRef.current) {
        const posArr = sprayParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < posArr.length; i += 3) {
          posArr[i] += 0.2;
          if (posArr[i] > 20) posArr[i] = 0;
        }
        sprayParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Pulsate selected or hovered marker
      markerMeshesRef.current.forEach(({ mesh, defect }) => {
        const isSel = defect.defect_id === selectedDefectId;
        const isHov = hoveredDefect && defect.defect_id === hoveredDefect.defect_id;
        if (isSel || isHov) {
          const time = Date.now() * 0.006;
          const scale = 1 + Math.sin(time) * 0.25;
          mesh.scale.set(scale, scale, scale);
        } else {
          mesh.scale.set(1, 1, 1);
        }
      });

      // Smooth camera position interpolation when fly-to target is active
      if (targetCamPosRef.current && targetLookAtRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.05);
        controls.target.lerp(targetLookAtRef.current, 0.05);

        if (camera.position.distanceTo(targetCamPosRef.current) < 0.5) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 10. Cleanup
    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', handlePointerMove);
        renderer.domElement.removeEventListener('click', handlePointerClick);
      }
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

      scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const m = object as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else if (m.material) m.material.dispose();
        }
      });
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [modelUrl, showDefects, severityFilter, isMeasuringMode, measurementPoints]);

  // --------------------------------------------------------------------------
  // HANDLE CAMERA PRESETS, RENDER MODES & CLIPPING PLANES
  // --------------------------------------------------------------------------
  useEffect(() => {
    const preset = CAMERA_PRESETS.find((p) => p.id === activePreset);
    if (preset && cameraRef.current && controlsRef.current) {
      targetCamPosRef.current = new THREE.Vector3(...preset.position);
      targetLookAtRef.current = new THREE.Vector3(...preset.target);
    }
  }, [activePreset]);

  // Handle selected defect camera fly-to focus
  useEffect(() => {
    if (!selectedDefectId) return;
    const targetDefect = defects.find((d) => d.defect_id === selectedDefectId);
    if (targetDefect && targetDefect.position_available) {
      const p = targetDefect.position_3d;
      targetCamPosRef.current = new THREE.Vector3(p.x + 30, p.y + 25, p.z + 35);
      targetLookAtRef.current = new THREE.Vector3(p.x, p.y, p.z);
    }
  }, [selectedDefectId, defects]);

  // Handle render mode updates (Realistic vs Wireframe vs Stress vs Heatmap vs XRay)
  useEffect(() => {
    if (damMeshesRef.current.length === 0) return;

    damMeshesRef.current.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (renderMode === 'WIREFRAME') {
        mat.wireframe = true;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.color.setHex(0x38bdf8);
      } else if (renderMode === 'STRESS') {
        mat.wireframe = false;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.color.setHex(0xe11d48); // Rose red FEA stress concentration preview
        mat.roughness = 0.5;
      } else if (renderMode === 'HEATMAP') {
        mat.wireframe = false;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.color.setHex(0xf59e0b); // Thermal Amber/Orange defect density mode
        mat.emissive.setHex(0xb45309);
        mat.emissiveIntensity = 0.35;
      } else if (renderMode === 'XRAY_GHOST') {
        mat.wireframe = false;
        mat.transparent = true;
        mat.opacity = 0.35; // Translucent ghost shell
        mat.color.setHex(0x0284c7);
        mat.roughness = 0.1;
      } else {
        mat.wireframe = false;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.color.setHex(0xffffff);
        mat.emissive.setHex(0x000000);
      }
    });
  }, [renderMode]);

  // Handle section cut clipping planes
  useEffect(() => {
    if (!rendererRef.current) return;

    if (clippingAxis && clippingAxis !== 'NONE') {
      rendererRef.current.localClippingEnabled = true;

      let normal = new THREE.Vector3(1, 0, 0);
      if (clippingAxis === 'Y') normal = new THREE.Vector3(0, 1, 0);
      if (clippingAxis === 'Z') normal = new THREE.Vector3(0, 0, 1);

      const offsetVal = clippingOffset !== undefined ? clippingOffset : 0;
      const plane = new THREE.Plane(normal, offsetVal);

      damMeshesRef.current.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.clippingPlanes = [plane];
        mat.clipShadows = true;
        mat.needsUpdate = true;
      });
    } else {
      rendererRef.current.localClippingEnabled = false;
      damMeshesRef.current.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.clippingPlanes = [];
        mat.needsUpdate = true;
      });
    }
  }, [clippingAxis, clippingOffset]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-slate-950 overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center text-white space-y-4">
          <div className="relative">
            <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
            <Sparkles className="w-4 h-4 text-emerald-400 absolute -top-1 -right-1 animate-ping" />
          </div>
          <p className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono">
            {loadingText}
          </p>
          <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
            <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Floating 3D Hover Tooltip */}
      {hoveredDefect && (
        <div
          className="absolute z-40 pointer-events-none bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white p-3 rounded-lg shadow-xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3 min-w-[200px]"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="flex items-center justify-between font-mono border-b border-slate-800 pb-1">
            <span className="font-bold text-blue-400">{hoveredDefect.defect_code}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                hoveredDefect.severity === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : hoveredDefect.severity === 'HIGH'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {hoveredDefect.severity}
            </span>
          </div>
          <p className="text-slate-300 font-semibold text-[11px]">{hoveredDefect.defect_type}</p>
          <p className="text-slate-400 text-[10px]">{hoveredDefect.location_precision} ({hoveredDefect.location_source})</p>
          {hoveredDefect.ai_detection_confidence !== undefined && (
            <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
              <span>AI Confidence</span>
              <span className="text-emerald-400 font-mono font-bold">
                {(hoveredDefect.ai_detection_confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
