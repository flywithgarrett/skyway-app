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

function latLngTo3D(lat: number, lng: number, r: number = RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

// Subtle, realistic starfield — small, dim, non-distracting
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
    // Slight color variation — warm/cool white
    const temp = 0.7 + Math.random() * 0.3;
    colors[i * 3] = temp;
    colors[i * 3 + 1] = temp * (0.9 + Math.random() * 0.1);
    colors[i * 3 + 2] = temp * (0.95 + Math.random() * 0.1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      depthWrite: false,
    })
  );
}

// Create a high-quality airplane silhouette sprite texture
function createAircraftTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  // Outer glow
  const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  glowGrad.addColorStop(0, "rgba(0, 229, 255, 0.25)");
  glowGrad.addColorStop(0.3, "rgba(0, 229, 255, 0.08)");
  glowGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, size, size);

  // Draw sleek aircraft silhouette (top-down view, pointing up)
  ctx.save();
  ctx.translate(cx, cy);
  const s = size * 0.18; // scale factor

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.shadowColor = "rgba(0, 229, 255, 0.6)";
  ctx.shadowBlur = 8;

  ctx.beginPath();
  // Fuselage — sleek tapered body
  ctx.moveTo(0, -s * 1.7);       // nose
  ctx.lineTo(s * 0.18, -s * 0.8);
  ctx.lineTo(s * 0.18, s * 0.2);
  ctx.lineTo(s * 0.12, s * 1.5);  // tail
  ctx.lineTo(-s * 0.12, s * 1.5);
  ctx.lineTo(-s * 0.18, s * 0.2);
  ctx.lineTo(-s * 0.18, -s * 0.8);
  ctx.closePath();
  ctx.fill();

  // Wings — swept back
  ctx.beginPath();
  ctx.moveTo(s * 0.15, -s * 0.15);
  ctx.lineTo(s * 1.5, s * 0.5);
  ctx.lineTo(s * 1.5, s * 0.65);
  ctx.lineTo(s * 0.18, s * 0.15);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-s * 0.15, -s * 0.15);
  ctx.lineTo(-s * 1.5, s * 0.5);
  ctx.lineTo(-s * 1.5, s * 0.65);
  ctx.lineTo(-s * 0.18, s * 0.15);
  ctx.closePath();
  ctx.fill();

  // Tail fins
  ctx.beginPath();
  ctx.moveTo(s * 0.1, s * 1.1);
  ctx.lineTo(s * 0.55, s * 1.5);
  ctx.lineTo(s * 0.55, s * 1.6);
  ctx.lineTo(s * 0.12, s * 1.35);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-s * 0.1, s * 1.1);
  ctx.lineTo(-s * 0.55, s * 1.5);
  ctx.lineTo(-s * 0.55, s * 1.6);
  ctx.lineTo(-s * 0.12, s * 1.35);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Subtle atmospheric edge glow — realistic, not cartoony
const edgeGlowVertex = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const edgeGlowFragment = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = 1.0 - dot(vNormal, vViewDir);
    // Very thin, soft edge — realistic atmosphere
    float rim = pow(fresnel, 6.0) * 0.8;
    float haze = pow(fresnel, 2.5) * 0.06;
    float intensity = rim + haze;
    // Slight blue-white atmosphere tint
    vec3 color = mix(vec3(0.35, 0.6, 0.9), vec3(0.6, 0.8, 1.0), pow(fresnel, 3.0));
    gl_FragColor = vec4(color, intensity);
  }
`;

export default function Globe({
  flights,
  airports,
  selectedFlight,
  onSelectFlight,
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
    flightGroup: THREE.Group;
    routeLine: THREE.Line | null;
    animationId: number;
  } | null>(null);
  const onSelectRef = useRef(onSelectFlight);
  onSelectRef.current = onSelectFlight;
  const selectedRef = useRef(selectedFlight);
  selectedRef.current = selectedFlight;
  const flightsRef = useRef(flights);
  flightsRef.current = flights;
  const airportsRef = useRef(airports);
  airportsRef.current = airports;

  useEffect(() => {
    if (!containerRef.current || sceneDataRef.current) return;
    const container = containerRef.current;

    // Scene — deep space black
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010204);

    // Camera — close to fill screen vertically
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      1,
      3000
    );
    camera.position.set(50, 45, 165);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Subtle starfield
    scene.add(createStars());

    // Minimal ambient — keeps dark side truly dark
    scene.add(new THREE.AmbientLight(0x111122, 0.3));

    // Globe sphere — starts dark, texture loaded async
    const globeGeo = new THREE.SphereGeometry(RADIUS, 96, 96);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0x050a14,
    });

    // Load night earth texture with high contrast
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        // Switch to MeshBasicMaterial for maximum emissive city lights
        globeMat.map = texture;
        globeMat.color = new THREE.Color(1.4, 1.4, 1.4); // boost brightness
        globeMat.needsUpdate = true;
      }
    );

    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Realistic thin atmospheric edge glow
    const atmGeo = new THREE.SphereGeometry(RADIUS * 1.005, 96, 96);
    const atmMat = new THREE.ShaderMaterial({
      vertexShader: edgeGlowVertex,
      fragmentShader: edgeGlowFragment,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Airport markers
    const airportGroup = new THREE.Group();
    scene.add(airportGroup);

    const markerGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x3bb8e8 });
    const glowGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x3bb8e8,
      transparent: true,
      opacity: 0.12,
    });

    airportsRef.current.forEach((airport) => {
      const pos = latLngTo3D(airport.lat, airport.lng, RADIUS * 1.003);
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pos);
      airportGroup.add(marker);

      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      airportGroup.add(glow);
    });

    // Aircraft sprites using instanced approach with Points
    const flightGroup = new THREE.Group();
    scene.add(flightGroup);

    const aircraftTexture = createAircraftTexture();

    const airborne = flightsRef.current.filter(
      (f) => f.status === "en-route" || (f.progress > 0 && f.progress < 1)
    );

    const flightPositions = new Float32Array(airborne.length * 3);
    const flightSizes = new Float32Array(airborne.length);
    airborne.forEach((f, i) => {
      const pos = latLngTo3D(f.currentLat, f.currentLng, RADIUS * 1.012);
      flightPositions[i * 3] = pos.x;
      flightPositions[i * 3 + 1] = pos.y;
      flightPositions[i * 3 + 2] = pos.z;
      flightSizes[i] = 5.0;
    });

    const flightPointsGeo = new THREE.BufferGeometry();
    flightPointsGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(flightPositions, 3)
    );
    flightPointsGeo.setAttribute(
      "size",
      new THREE.BufferAttribute(flightSizes, 1)
    );

    const flightPointsMat = new THREE.PointsMaterial({
      map: aircraftTexture,
      size: 5.0,
      sizeAttenuation: true,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
    });
    const flightPoints = new THREE.Points(flightPointsGeo, flightPointsMat);
    flightGroup.add(flightPoints);

    // Controls — buttery smooth
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.rotateSpeed = 0.35;
    controls.zoomSpeed = 0.6;
    controls.minDistance = 115;
    controls.maxDistance = 400;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.12;

    // Click handling
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 4 };
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(flightPoints);
      if (intersects.length > 0 && intersects[0].index !== undefined) {
        const idx = intersects[0].index;
        const currentAirborne = flightsRef.current.filter(
          (f) =>
            f.status === "en-route" || (f.progress > 0 && f.progress < 1)
        );
        const flight = currentAirborne[idx];
        if (flight) {
          if (selectedRef.current?.id === flight.id) {
            onSelectRef.current(null);
          } else {
            onSelectRef.current(flight);
          }
        }
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Animation loop
    const animate = () => {
      const animId = requestAnimationFrame(animate);
      if (sceneDataRef.current) {
        sceneDataRef.current.animationId = animId;
      }

      controls.update();

      // Dynamic aircraft sizing based on camera distance
      const camDist = camera.position.length();
      const scaleFactor = THREE.MathUtils.clamp(
        THREE.MathUtils.mapLinear(camDist, 115, 400, 7.0, 3.0),
        3.0,
        7.0
      );
      flightPointsMat.size = scaleFactor;

      renderer.render(scene, camera);

      // Update projected airport labels
      if (labelsRef.current) {
        const labels = labelsRef.current.children as HTMLCollectionOf<HTMLElement>;
        const camDir = camera.position.clone().normalize();

        for (let i = 0; i < airportsRef.current.length; i++) {
          const airport = airportsRef.current[i];
          const label = labels[i] as HTMLElement | undefined;
          if (!label) continue;

          const pos3D = latLngTo3D(airport.lat, airport.lng, RADIUS * 1.003);
          const pointDir = pos3D.clone().normalize();
          const dot = camDir.dot(pointDir);

          if (dot < 0.2) {
            label.style.display = "none";
            continue;
          }

          const projected = pos3D.clone().project(camera);
          const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
          const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

          label.style.display = "block";
          label.style.left = `${x}px`;
          label.style.top = `${y}px`;
          label.style.opacity = String(
            Math.min(1, (dot - 0.2) * 4) * 0.85
          );
        }
      }
    };

    const animId = requestAnimationFrame(animate);

    sceneDataRef.current = {
      scene,
      camera,
      renderer,
      controls,
      globe,
      airportGroup,
      flightGroup,
      routeLine: null,
      animationId: animId,
    };

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    (window as unknown as { __skyway_flights?: Flight[] }).__skyway_flights =
      flightsRef.current;

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      cancelAnimationFrame(sceneDataRef.current?.animationId || 0);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneDataRef.current = null;
    };
  }, []);

  // Route arc for selected flight
  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data) return;

    if (data.routeLine) {
      data.scene.remove(data.routeLine);
      data.routeLine.geometry.dispose();
      (data.routeLine.material as THREE.Material).dispose();
      data.routeLine = null;
    }

    if (!selectedFlight) return;

    const points: THREE.Vector3[] = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat1 = selectedFlight.origin.lat * DEG2RAD;
      const lng1 = selectedFlight.origin.lng * DEG2RAD;
      const lat2 = selectedFlight.destination.lat * DEG2RAD;
      const lng2 = selectedFlight.destination.lng * DEG2RAD;

      const d =
        2 *
        Math.asin(
          Math.sqrt(
            Math.sin((lat2 - lat1) / 2) ** 2 +
              Math.cos(lat1) *
                Math.cos(lat2) *
                Math.sin((lng2 - lng1) / 2) ** 2
          )
        );

      if (d < 1e-10) continue;

      const a = Math.sin((1 - t) * d) / Math.sin(d);
      const b = Math.sin(t * d) / Math.sin(d);

      const x =
        a * Math.cos(lat1) * Math.cos(lng1) +
        b * Math.cos(lat2) * Math.cos(lng2);
      const y =
        a * Math.cos(lat1) * Math.sin(lng1) +
        b * Math.cos(lat2) * Math.sin(lng2);
      const z = a * Math.sin(lat1) + b * Math.sin(lat2);

      const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
      const lng = Math.atan2(y, x) * (180 / Math.PI);

      const elevation = 1 + Math.sin(t * Math.PI) * 6;
      points.push(latLngTo3D(lat, lng, RADIUS + elevation));
    }

    if (points.length > 0) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.5,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      data.scene.add(line);
      data.routeLine = line;
    }
  }, [selectedFlight]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <div
        ref={labelsRef}
        className="absolute inset-0 z-[1] pointer-events-none overflow-hidden"
      >
        {airports.map((airport) => (
          <div
            key={airport.code}
            className="absolute text-[9px] font-mono tracking-wider font-medium"
            style={{
              color: "rgba(130, 195, 220, 0.8)",
              textShadow:
                "0 0 4px rgba(59, 184, 232, 0.25), 0 1px 3px rgba(0,0,0,0.9)",
              transform: "translate(-50%, 6px)",
              whiteSpace: "nowrap",
              letterSpacing: "0.08em",
            }}
          >
            {airport.code}
          </div>
        ))}
      </div>
    </>
  );
}
