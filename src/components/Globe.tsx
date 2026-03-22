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

function createStars(): THREE.Points {
  const count = 8000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 600 + Math.random() * 600;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 0.3 + Math.random() * 1.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    })
  );
}

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = 1.0 - dot(vNormal, vViewDir);
    float intensity = pow(fresnel, 3.5);
    vec3 color = mix(vec3(0.1, 0.3, 0.6), vec3(0.15, 0.5, 0.8), fresnel);
    gl_FragColor = vec4(color, intensity * 0.55);
  }
`;

const outerGlowVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const outerGlowFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = 1.0 - dot(vNormal, vViewDir);
    float intensity = pow(fresnel, 5.0);
    gl_FragColor = vec4(0.15, 0.45, 0.75, intensity * 0.4);
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
    flightPointsGeo: THREE.BufferGeometry;
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

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || sceneDataRef.current) return;
    const container = containerRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020508);

    // Camera — angled to show North America like the reference
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      1,
      2000
    );
    camera.position.set(80, 80, 240);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Stars
    scene.add(createStars());

    // Ambient light
    scene.add(new THREE.AmbientLight(0x222244, 0.5));

    // Directional light (simulates sun — dim for night side)
    const sunLight = new THREE.DirectionalLight(0x334466, 0.4);
    sunLight.position.set(-200, 100, 200);
    scene.add(sunLight);

    // Globe sphere
    const globeGeo = new THREE.SphereGeometry(RADIUS, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      emissive: 0x040810,
      specular: 0x111833,
      shininess: 15,
    });

    // Try loading night earth texture
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        globeMat.map = texture;
        globeMat.emissiveMap = texture;
        globeMat.emissive = new THREE.Color(0xffffff);
        globeMat.emissiveIntensity = 1.1;
        globeMat.color = new THREE.Color(0x888888);
        globeMat.needsUpdate = true;
      },
      undefined,
      () => {
        // Fallback: keep the dark procedural color
      }
    );

    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Inner atmosphere (fresnel glow on globe surface)
    const atmGeo = new THREE.SphereGeometry(RADIUS * 1.01, 64, 64);
    const atmMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Outer atmosphere glow
    const outerGeo = new THREE.SphereGeometry(RADIUS * 1.15, 64, 64);
    const outerMat = new THREE.ShaderMaterial({
      vertexShader: outerGlowVertexShader,
      fragmentShader: outerGlowFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(outerGeo, outerMat));

    // Airport markers group
    const airportGroup = new THREE.Group();
    scene.add(airportGroup);

    // Create airport markers
    const markerGeo = new THREE.SphereGeometry(0.8, 12, 12);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x3bb8e8 });
    const glowGeo = new THREE.SphereGeometry(2.0, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x3bb8e8,
      transparent: true,
      opacity: 0.15,
    });

    airportsRef.current.forEach((airport) => {
      const pos = latLngTo3D(airport.lat, airport.lng, RADIUS * 1.005);
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pos);
      marker.userData = { type: "airport", code: airport.code };
      airportGroup.add(marker);

      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      airportGroup.add(glow);
    });

    // Flight dots as Points
    const flightPointsGeo = new THREE.BufferGeometry();
    const flightMat = new THREE.PointsMaterial({
      color: 0x3bb8e8,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });
    const flightPoints = new THREE.Points(flightPointsGeo, flightMat);
    scene.add(flightPoints);

    // Update flight positions
    const airborne = flightsRef.current.filter(
      (f) => f.status === "en-route" || (f.progress > 0 && f.progress < 1)
    );
    const flightPositions = new Float32Array(airborne.length * 3);
    airborne.forEach((f, i) => {
      const pos = latLngTo3D(f.currentLat, f.currentLng, RADIUS * 1.02);
      flightPositions[i * 3] = pos.x;
      flightPositions[i * 3 + 1] = pos.y;
      flightPositions[i * 3 + 2] = pos.z;
    });
    flightPointsGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(flightPositions, 3)
    );

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.4;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 130;
    controls.maxDistance = 500;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.15;

    // Route line placeholder
    let routeLine: THREE.Line | null = null;

    // Click handler
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 3 };
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
      sceneDataRef.current!.animationId = animId;

      controls.update();
      renderer.render(scene, camera);

      // Update labels
      if (labelsRef.current) {
        const labels = labelsRef.current.children as HTMLCollectionOf<HTMLElement>;
        const camPos = camera.position.clone().normalize();

        for (let i = 0; i < airportsRef.current.length; i++) {
          const airport = airportsRef.current[i];
          const label = labels[i] as HTMLElement | undefined;
          if (!label) continue;

          const pos3D = latLngTo3D(airport.lat, airport.lng, RADIUS * 1.005);
          const pointDir = pos3D.clone().normalize();
          const dot = camPos.dot(pointDir);

          if (dot < 0.15) {
            label.style.display = "none";
            continue;
          }

          const projected = pos3D.clone().project(camera);
          const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
          const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

          label.style.display = "block";
          label.style.left = `${x}px`;
          label.style.top = `${y}px`;
          label.style.opacity = String(Math.min(1, (dot - 0.15) * 3));
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
      flightPointsGeo,
      routeLine,
      animationId: animId,
    };

    // Resize handler
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Store flights globally for click handler
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

  // Update route line for selected flight
  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data) return;

    // Remove old route
    if (data.routeLine) {
      data.scene.remove(data.routeLine);
      data.routeLine.geometry.dispose();
      (data.routeLine.material as THREE.Material).dispose();
      data.routeLine = null;
    }

    if (!selectedFlight) return;

    // Create great circle arc
    const points: THREE.Vector3[] = [];
    const steps = 64;
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

      // Elevate arc above globe surface
      const elevation = 1 + Math.sin(t * Math.PI) * 8;
      points.push(latLngTo3D(lat, lng, RADIUS + elevation));
    }

    if (points.length > 0) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.6,
        linewidth: 1,
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
            className="absolute text-[10px] font-mono tracking-wide"
            style={{
              color: "rgba(107, 173, 201, 0.85)",
              textShadow: "0 0 6px rgba(59, 184, 232, 0.3), 0 1px 2px rgba(0,0,0,0.8)",
              transform: "translate(-50%, 8px)",
              whiteSpace: "nowrap",
            }}
          >
            {airport.code}
          </div>
        ))}
      </div>
    </>
  );
}
