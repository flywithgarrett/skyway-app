"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Flight, Airport } from "@/lib/types";

interface GlobeProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
}

const RADIUS = 100;
const DEG2RAD = Math.PI / 180;
const AIRCRAFT_SCALE = 2.4;
const AIRCRAFT_SCALE_SELECTED = 5.0;
const AIRCRAFT_ALT = RADIUS * 1.012;

function latLngTo3D(lat: number, lng: number, r: number = RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function computeBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const p1 = lat1 * DEG2RAD, p2 = lat2 * DEG2RAD, dl = (lng2 - lng1) * DEG2RAD;
  return ((Math.atan2(Math.cos(p2) * Math.sin(dl), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * 180 / Math.PI) + 360) % 360;
}

function buildSurfaceMatrix(lat: number, lng: number, headingDeg: number, r: number, scale: number): THREE.Matrix4 {
  const pos = latLngTo3D(lat, lng, r);
  const normal = pos.clone().normalize();
  const latN = Math.min(lat + 0.05, 89.95);
  const posNorth = latLngTo3D(latN, lng, r);
  const northTangent = posNorth.sub(pos).normalize();
  const eastTangent = new THREE.Vector3().crossVectors(normal, northTangent).normalize();
  northTangent.crossVectors(eastTangent, normal).normalize();
  const headingRad = headingDeg * DEG2RAD;
  const forward = new THREE.Vector3()
    .addScaledVector(northTangent, Math.cos(headingRad))
    .addScaledVector(eastTangent, Math.sin(headingRad))
    .normalize();
  const right = new THREE.Vector3().crossVectors(forward, normal).normalize();
  const rot = new THREE.Matrix4().makeBasis(right, forward, normal);
  const scaleMat = new THREE.Matrix4().makeScale(scale, scale, scale);
  const transMat = new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z);
  return transMat.multiply(rot).multiply(scaleMat);
}

// Compute great circle arc points between two lat/lng positions
function greatCirclePoints(
  lat1: number, lng1: number, lat2: number, lng2: number, steps: number, elevationScale: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const la1 = lat1 * DEG2RAD, lo1 = lng1 * DEG2RAD;
  const la2 = lat2 * DEG2RAD, lo2 = lng2 * DEG2RAD;
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2
  ));
  if (d < 1e-10) return points;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = Math.sin((1 - t) * d) / Math.sin(d);
    const b = Math.sin(t * d) / Math.sin(d);
    const x = a * Math.cos(la1) * Math.cos(lo1) + b * Math.cos(la2) * Math.cos(lo2);
    const y = a * Math.cos(la1) * Math.sin(lo1) + b * Math.cos(la2) * Math.sin(lo2);
    const z = a * Math.sin(la1) + b * Math.sin(la2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
    const lng = Math.atan2(y, x) * (180 / Math.PI);
    const elevation = 1 + Math.sin(t * Math.PI) * elevationScale;
    points.push(latLngTo3D(lat, lng, RADIUS + elevation));
  }
  return points;
}

function createStars(): THREE.Points {
  const count = 4000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 800 + Math.random() * 800;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const temp = 0.7 + Math.random() * 0.3;
    colors[i * 3] = temp;
    colors[i * 3 + 1] = temp * (0.9 + Math.random() * 0.1);
    colors[i * 3 + 2] = temp * (0.95 + Math.random() * 0.1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.6, sizeAttenuation: true, transparent: true, opacity: 0.5,
    vertexColors: true, depthWrite: false,
  }));
}

function createAircraftTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const cx = size / 2, cy = size / 2;

  // Minimal radial glow — clean Apple-style
  const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.35);
  g1.addColorStop(0, "rgba(255, 255, 255, 0.04)");
  g1.addColorStop(0.3, "rgba(0, 229, 255, 0.01)");
  g1.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(cx, cy);

  // Precise Boeing 787 / A350 top-down SVG-quality silhouette
  // Scale: nose at -s*2.0, tail at s*1.6, wingspan ±s*1.7
  const s = size * 0.14;

  const drawPrecisePlane = () => {
    ctx.beginPath();
    // Nose cone — sharp pointed
    ctx.moveTo(0, -s * 2.0);
    // Right fuselage
    ctx.bezierCurveTo(s * 0.08, -s * 1.7, s * 0.14, -s * 1.0, s * 0.14, -s * 0.3);
    // Right wing root leading edge
    ctx.lineTo(s * 0.16, -s * 0.15);
    // Right wing tip — long swept
    ctx.bezierCurveTo(s * 0.5, -s * 0.05, s * 1.2, s * 0.25, s * 1.7, s * 0.45);
    // Right wing trailing edge
    ctx.lineTo(s * 1.65, s * 0.55);
    ctx.bezierCurveTo(s * 1.1, s * 0.4, s * 0.5, s * 0.2, s * 0.16, s * 0.15);
    // Right fuselage continues aft
    ctx.lineTo(s * 0.14, s * 1.0);
    // Right horizontal stabilizer
    ctx.lineTo(s * 0.13, s * 1.15);
    ctx.bezierCurveTo(s * 0.3, s * 1.2, s * 0.55, s * 1.35, s * 0.6, s * 1.45);
    ctx.lineTo(s * 0.58, s * 1.52);
    ctx.bezierCurveTo(s * 0.4, s * 1.45, s * 0.2, s * 1.35, s * 0.1, s * 1.3);
    // Tail cone
    ctx.lineTo(s * 0.06, s * 1.6);
    ctx.lineTo(-s * 0.06, s * 1.6);
    // Left horizontal stabilizer
    ctx.lineTo(-s * 0.1, s * 1.3);
    ctx.bezierCurveTo(-s * 0.2, s * 1.35, -s * 0.4, s * 1.45, -s * 0.58, s * 1.52);
    ctx.lineTo(-s * 0.6, s * 1.45);
    ctx.bezierCurveTo(-s * 0.55, s * 1.35, -s * 0.3, s * 1.2, -s * 0.13, s * 1.15);
    ctx.lineTo(-s * 0.14, s * 1.0);
    // Left fuselage
    ctx.lineTo(-s * 0.16, s * 0.15);
    // Left wing trailing edge
    ctx.bezierCurveTo(-s * 0.5, s * 0.2, -s * 1.1, s * 0.4, -s * 1.65, s * 0.55);
    ctx.lineTo(-s * 1.7, s * 0.45);
    // Left wing leading edge
    ctx.bezierCurveTo(-s * 1.2, s * 0.25, -s * 0.5, -s * 0.05, -s * 0.16, -s * 0.15);
    ctx.lineTo(-s * 0.14, -s * 0.3);
    // Left fuselage to nose
    ctx.bezierCurveTo(-s * 0.14, -s * 1.0, -s * 0.08, -s * 1.7, 0, -s * 2.0);
    ctx.closePath();
    ctx.fill();
  };

  // Clean pass: crisp white plane with subtle cyan edge glow
  ctx.shadowColor = "rgba(0, 229, 255, 0.25)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "rgba(220, 240, 255, 0.85)";
  drawPrecisePlane();

  // Second pass: bright white core, no glow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  drawPrecisePlane();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// --- Shaders ---

const edgeGlowVertex = `
  varying vec3 vNormal; varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;
const edgeGlowFragment = `
  varying vec3 vNormal; varying vec3 vViewDir;
  void main() {
    float fresnel = 1.0 - dot(vNormal, vViewDir);
    float rim = pow(fresnel, 6.0) * 0.8;
    float haze = pow(fresnel, 2.5) * 0.06;
    vec3 color = mix(vec3(0.35, 0.6, 0.9), vec3(0.6, 0.8, 1.0), pow(fresnel, 3.0));
    gl_FragColor = vec4(color, rim + haze);
  }
`;

const jetstreamVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const jetstreamFragment = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float flow = fract(vUv.x * 5.0 - uTime * 0.6);
    float pulse = smoothstep(0.0, 0.12, flow) * smoothstep(0.4, 0.28, flow);
    float core = smoothstep(0.5, 0.0, abs(vUv.y - 0.5));
    vec3 cyan = vec3(0.0, 0.9, 1.0);
    vec3 purple = vec3(0.45, 0.15, 0.95);
    vec3 color = mix(cyan, purple, vUv.x * 0.35);
    float base = core * 0.12;
    float glow = core * pulse * 0.55;
    gl_FragColor = vec4(color * (1.0 + pulse * 0.4), base + glow);
  }
`;

// --- Component ---

export default function Globe({
  flights, airports, selectedFlight, onSelectFlight,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneDataRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    globe: THREE.Mesh;
    airportGroup: THREE.Group;
    aircraftMesh: THREE.InstancedMesh;
    airborneFlights: Flight[];
    instanceColors: Float32Array;
    // Dead reckoning: mutable lat/lng positions advanced each frame
    drLats: Float64Array;
    drLngs: Float64Array;
    lastFrameTime: number;
    jetstream: THREE.Mesh | null;
    jetstreamMat: THREE.ShaderMaterial | null;
    clock: THREE.Clock;
    animationId: number;
  } | null>(null);
  const cameraAnimRef = useRef<{ targetPos: THREE.Vector3 } | null>(null);
  const onSelectRef = useRef(onSelectFlight);
  onSelectRef.current = onSelectFlight;
  const selectedRef = useRef(selectedFlight);
  selectedRef.current = selectedFlight;
  const flightsRef = useRef(flights);
  flightsRef.current = flights;
  const airportsRef = useRef(airports);
  airportsRef.current = airports;

  // --- Init scene ---
  useEffect(() => {
    if (!containerRef.current || sceneDataRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010204);
    const clock = new THREE.Clock();

    const camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 1, 3000
    );
    // Start facing Pacific for cinematic intro sweep
    const introStart = latLngTo3D(25, 160, 1).normalize().multiplyScalar(260);
    camera.position.copy(introStart);

    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: false, powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    scene.add(createStars());
    scene.add(new THREE.AmbientLight(0x111122, 0.3));

    // Globe — high-res sphere with night earth texture
    const globeGeo = new THREE.SphereGeometry(RADIUS, 128, 128);
    const globeMat = new THREE.MeshBasicMaterial({ color: 0x050a14 });
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        globeMat.map = texture;
        globeMat.color = new THREE.Color(1.6, 1.6, 1.6);
        globeMat.needsUpdate = true;
      }
    );
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Atmosphere
    const atmGeo = new THREE.SphereGeometry(RADIUS * 1.005, 96, 96);
    scene.add(new THREE.Mesh(atmGeo, new THREE.ShaderMaterial({
      vertexShader: edgeGlowVertex, fragmentShader: edgeGlowFragment,
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.FrontSide, depthWrite: false,
    })));

    // Airport markers
    const airportGroup = new THREE.Group();
    scene.add(airportGroup);
    const mGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const mMat = new THREE.MeshBasicMaterial({ color: 0x3bb8e8 });
    const gGeo = new THREE.SphereGeometry(0.8, 12, 12);
    const gMat = new THREE.MeshBasicMaterial({ color: 0x3bb8e8, transparent: true, opacity: 0.10 });
    airportsRef.current.forEach((a) => {
      const p = latLngTo3D(a.lat, a.lng, RADIUS * 1.003);
      const m = new THREE.Mesh(mGeo, mMat); m.position.copy(p); airportGroup.add(m);
      const g = new THREE.Mesh(gGeo, gMat); g.position.copy(p); airportGroup.add(g);
    });

    // Aircraft InstancedMesh — capacity for live data updates
    const MAX_FLIGHTS = 4000;
    const aircraftTexture = createAircraftTexture();
    const airborne = flightsRef.current.filter(
      (f) => !f.onGround && f.currentLat !== 0 && f.currentLng !== 0
    );
    // BoxGeometry with tiny depth for reliable raycasting from all camera angles
    const planeGeo = new THREE.BoxGeometry(1, 1, 0.01);
    const planeMat = new THREE.MeshBasicMaterial({
      map: aircraftTexture, transparent: true, alphaTest: 0.05,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.NormalBlending,
    });
    const aircraftMesh = new THREE.InstancedMesh(planeGeo, planeMat, MAX_FLIGHTS);
    aircraftMesh.frustumCulled = false;
    aircraftMesh.count = Math.min(airborne.length, MAX_FLIGHTS);

    // Per-instance colors for highlighting
    const instanceColors = new Float32Array(MAX_FLIGHTS * 3).fill(1);
    aircraftMesh.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);

    airborne.forEach((f, i) => {
      if (i >= MAX_FLIGHTS) return;
      aircraftMesh.setMatrixAt(i, buildSurfaceMatrix(f.currentLat, f.currentLng, f.heading, AIRCRAFT_ALT, AIRCRAFT_SCALE));
    });
    aircraftMesh.instanceMatrix.needsUpdate = true;
    scene.add(aircraftMesh);

    // Controls — NO autoRotate
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.35;
    controls.zoomSpeed = 0.6;
    controls.minDistance = 115;
    controls.maxDistance = 400;
    controls.enablePan = false;
    controls.autoRotate = false;

    // Cinematic intro — sweep from Pacific to center on US
    const usTarget = latLngTo3D(39, -98, 1).normalize().multiplyScalar(260);
    cameraAnimRef.current = { targetPos: usTarget };

    // Click + hover handling with raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getRayHit = (e: MouseEvent): number | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(aircraftMesh);
      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        return intersects[0].instanceId;
      }
      return null;
    };

    const onClick = (e: MouseEvent) => {
      const idx = getRayHit(e);
      if (idx !== null) {
        const flight = sceneDataRef.current?.airborneFlights[idx];
        if (flight) {
          onSelectRef.current(selectedRef.current?.id === flight.id ? null : flight);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const idx = getRayHit(e);
      renderer.domElement.style.cursor = idx !== null ? "pointer" : "";
    };

    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("mousemove", onMouseMove);

    // Animation loop
    const animate = () => {
      const animId = requestAnimationFrame(animate);
      if (sceneDataRef.current) sceneDataRef.current.animationId = animId;

      // Camera animation (intro or flight-select)
      const anim = cameraAnimRef.current;
      if (anim) {
        controls.enabled = false;
        camera.position.lerp(anim.targetPos, 0.035);
        camera.lookAt(0, 0, 0);
        if (camera.position.distanceTo(anim.targetPos) < 0.3) {
          cameraAnimRef.current = null;
          controls.enabled = true;
        }
      } else {
        controls.update();
      }

      // Dead reckoning + dynamic zoom scaling
      const sd = sceneDataRef.current;
      if (sd) {
        const now = performance.now();
        const dtSec = Math.min((now - sd.lastFrameTime) / 1000, 0.1);
        sd.lastFrameTime = now;
        const flightCount = Math.min(sd.airborneFlights.length, 4000);

        // Dynamic scale: planes shrink when zoomed out, grow when zoomed in
        const camDist = camera.position.length();
        // At distance 260 (default): scale = AIRCRAFT_SCALE (2.4)
        // At distance 115 (min zoom): scale ~= 1.0 (smaller)
        // At distance 400 (max zoom out): scale ~= 3.5 (visible dots)
        const zoomScale = AIRCRAFT_SCALE * (260 / Math.max(camDist, 100)) * 0.85;

        const KTS_TO_DEG_PER_SEC = 1 / (3600 * 60);
        for (let i = 0; i < flightCount; i++) {
          const f = sd.airborneFlights[i];
          const hdgRad = f.heading * DEG2RAD;
          if (f.speed > 0) {
            const deltaDeg = f.speed * KTS_TO_DEG_PER_SEC * dtSec;
            sd.drLats[i] += Math.cos(hdgRad) * deltaDeg;
            const cosLat = Math.cos(sd.drLats[i] * DEG2RAD);
            sd.drLngs[i] += Math.sin(hdgRad) * deltaDeg / (cosLat || 1);
          }
          if (selectedRef.current?.id === f.id) {
            sd.aircraftMesh.setMatrixAt(i, buildSurfaceMatrix(sd.drLats[i], sd.drLngs[i], f.heading, AIRCRAFT_ALT, zoomScale * 1.8));
          } else {
            sd.aircraftMesh.setMatrixAt(i, buildSurfaceMatrix(sd.drLats[i], sd.drLngs[i], f.heading, AIRCRAFT_ALT, zoomScale));
          }
        }
        sd.aircraftMesh.instanceMatrix.needsUpdate = true;
      }

      // Update jetstream shader time
      if (sceneDataRef.current?.jetstreamMat) {
        sceneDataRef.current.jetstreamMat.uniforms.uTime.value = clock.getElapsedTime();
      }

      renderer.render(scene, camera);

      // Project airport labels
      if (labelsRef.current) {
        const labels = labelsRef.current.children as HTMLCollectionOf<HTMLElement>;
        const camDir = camera.position.clone().normalize();
        for (let i = 0; i < airportsRef.current.length; i++) {
          const airport = airportsRef.current[i];
          const label = labels[i] as HTMLElement | undefined;
          if (!label) continue;
          const pos3D = latLngTo3D(airport.lat, airport.lng, RADIUS * 1.003);
          const dot = camDir.dot(pos3D.clone().normalize());
          if (dot < 0.2) { label.style.display = "none"; continue; }
          const projected = pos3D.clone().project(camera);
          label.style.display = "block";
          label.style.left = `${(projected.x * 0.5 + 0.5) * container.clientWidth}px`;
          label.style.top = `${(-projected.y * 0.5 + 0.5) * container.clientHeight}px`;
          label.style.opacity = String(Math.min(1, (dot - 0.2) * 4) * 0.85);
        }
      }
    };

    const animId = requestAnimationFrame(animate);

    // Initialize dead reckoning arrays from initial positions
    const MAX = 4000;
    const drLats = new Float64Array(MAX);
    const drLngs = new Float64Array(MAX);
    for (let i = 0; i < airborne.length && i < MAX; i++) {
      drLats[i] = airborne[i].currentLat;
      drLngs[i] = airborne[i].currentLng;
    }

    sceneDataRef.current = {
      scene, camera, renderer, controls, globe, airportGroup,
      aircraftMesh, airborneFlights: airborne, instanceColors,
      drLats, drLngs, lastFrameTime: performance.now(),
      jetstream: null, jetstreamMat: null, clock,
      animationId: animId,
    };

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    (window as unknown as { __skyway_flights?: Flight[] }).__skyway_flights = flightsRef.current;

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(sceneDataRef.current?.animationId || 0);
      renderer.dispose(); scene.clear();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      sceneDataRef.current = null;
    };
  }, []);

  // --- Update aircraft when live flights change ---
  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data) return;
    const airborne = flights.filter(
      (f) => !f.onGround && f.currentLat !== 0 && f.currentLng !== 0
    );
    const count = Math.min(airborne.length, 4000);
    data.airborneFlights = airborne;
    data.aircraftMesh.count = count;
    // Reset dead reckoning positions to fresh API data
    for (let i = 0; i < count; i++) {
      const f = airborne[i];
      data.drLats[i] = f.currentLat;
      data.drLngs[i] = f.currentLng;
      data.aircraftMesh.setMatrixAt(i, buildSurfaceMatrix(f.currentLat, f.currentLng, f.heading, AIRCRAFT_ALT, AIRCRAFT_SCALE));
      data.instanceColors[i * 3] = 1;
      data.instanceColors[i * 3 + 1] = 1;
      data.instanceColors[i * 3 + 2] = 1;
    }
    data.lastFrameTime = performance.now();
    data.aircraftMesh.instanceMatrix.needsUpdate = true;
    if (data.aircraftMesh.instanceColor)
      (data.aircraftMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }, [flights]);

  // --- Selection: jetstream, camera, highlighting ---
  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data) return;

    // Clean up previous jetstream
    if (data.jetstream) {
      data.scene.remove(data.jetstream);
      data.jetstream.geometry.dispose();
      (data.jetstream.material as THREE.Material).dispose();
      data.jetstream = null;
      data.jetstreamMat = null;
    }

    const { aircraftMesh, airborneFlights, instanceColors } = data;

    const count = Math.min(airborneFlights.length, 4000);

    if (!selectedFlight) {
      // Reset all aircraft to full brightness — scaling handled by animation loop
      for (let i = 0; i < count; i++) {
        instanceColors[i * 3] = 1; instanceColors[i * 3 + 1] = 1; instanceColors[i * 3 + 2] = 1;
      }
      if (aircraftMesh.instanceColor) (aircraftMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
      return;
    }

    const selectedIdx = airborneFlights.findIndex((f) => f.id === selectedFlight.id);

    for (let i = 0; i < count; i++) {
      if (i === selectedIdx) {
        // Bright white selected aircraft
        instanceColors[i * 3] = 2.0; instanceColors[i * 3 + 1] = 2.0; instanceColors[i * 3 + 2] = 2.0;
      } else {
        // Dim unselected — subtle visibility
        instanceColors[i * 3] = 0.15; instanceColors[i * 3 + 1] = 0.15; instanceColors[i * 3 + 2] = 0.2;
      }
    }
    if (aircraftMesh.instanceColor) (aircraftMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;

    // Jetstream route arc: Origin → Aircraft → Destination
    // Use airport coords if available (non-zero), otherwise skip that segment
    const origLat = selectedFlight.origin.lat;
    const origLng = selectedFlight.origin.lng;
    const destLat = selectedFlight.destination.lat;
    const destLng = selectedFlight.destination.lng;
    const acLat = selectedFlight.currentLat;
    const acLng = selectedFlight.currentLng;
    const hasOrig = origLat !== 0 || origLng !== 0;
    const hasDest = destLat !== 0 || destLng !== 0;

    const allArcPoints: THREE.Vector3[] = [];

    // Segment 1: Origin → Aircraft (if origin coords valid)
    if (hasOrig) {
      allArcPoints.push(...greatCirclePoints(origLat, origLng, acLat, acLng, 50, 4));
    }
    // Segment 2: Aircraft → Destination (if dest coords valid)
    if (hasDest) {
      const seg2 = greatCirclePoints(acLat, acLng, destLat, destLng, 50, 4);
      // Skip first point to avoid duplicate at aircraft position
      if (allArcPoints.length > 0 && seg2.length > 0) seg2.shift();
      allArcPoints.push(...seg2);
    }

    if (allArcPoints.length > 3) {
      const curve = new THREE.CatmullRomCurve3(allArcPoints, false, "catmullrom", 0.5);
      const tubeGeo = new THREE.TubeGeometry(curve, 120, 0.3, 8, false);
      const tubeMat = new THREE.ShaderMaterial({
        vertexShader: jetstreamVertex, fragmentShader: jetstreamFragment,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: data.clock.getElapsedTime() } },
      });
      const jetstream = new THREE.Mesh(tubeGeo, tubeMat);
      data.scene.add(jetstream);
      data.jetstream = jetstream;
      data.jetstreamMat = tubeMat;
    }

    // Cinematic camera: center on the aircraft position
    const camCenter = latLngTo3D(acLat, acLng, 1).normalize();
    const camTarget = camCenter.multiplyScalar(175);
    cameraAnimRef.current = { targetPos: camTarget };

  }, [selectedFlight]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <div ref={labelsRef} className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {airports.map((airport) => (
          <div
            key={airport.code}
            className="absolute text-[11px] font-mono tracking-wider font-semibold"
            style={{
              color: "rgba(150, 210, 235, 0.9)",
              textShadow: "0 0 6px rgba(59, 184, 232, 0.35), 0 1px 4px rgba(0,0,0,0.95)",
              transform: "translate(-50%, 4px)", whiteSpace: "nowrap", letterSpacing: "0.1em",
            }}
          >
            {airport.code}
          </div>
        ))}
      </div>
    </>
  );
}
