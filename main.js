import {
  Scene,
  FogExp2,
  SphereBufferGeometry,
  MeshMatcapMaterial,
  Group,
  TangentSpaceNormalMap,
  TextureLoader,
  Vector3,
  Euler,
  Mesh,
  WebGLRenderer,
  PerspectiveCamera,
  MeshNormalMaterial,
  BoxBufferGeometry,
  RawShaderMaterial,
  BufferAttribute,
  TorusBufferGeometry,
  IcosahedronBufferGeometry,
  Matrix3,
  Matrix4,
  BufferGeometry,
} from "./three.module.js";
import { OrbitControls } from "./OrbitControls.js";

const scene = new Scene();
scene.fog = new FogExp2(0x1f1f1f, 0.01);
// scene.background = new Color(0x1f1f1f)

// const geom = new (RoundedBoxGeometry(THREE))(1, 1, 1, .1, 5)
const geom = new IcosahedronBufferGeometry(1, 3);
// const geom = new TorusGeometry(1, .1, 16, 100)

const material = new MeshMatcapMaterial({
  matcap: new TextureLoader().load("matcap.png"),
  normalMapType: TangentSpaceNormalMap,
});
const material2 = new MeshMatcapMaterial({
  matcap: new TextureLoader().load(
    "https://makio135.com/matcaps/512/736655_D9D8D5_2F281F_B1AEAB-512px.png"
  ),
  normalMapType: TangentSpaceNormalMap,
});
const material3 = new MeshMatcapMaterial({
  matcap: new TextureLoader().load(
    "https://makio135.com/matcaps/512/181F1F_475057_616566_525C62-512px.png"
  ),
  normalMapType: TangentSpaceNormalMap,
});

const mat = new MeshNormalMaterial({ wireframe: true });

const vertexShader = `#version 300 es
precision highp float;

in vec3 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
uniform float SEGMENTS;
uniform float SIDES;

const float PI = 3.1415926535897932384626433832795;
const float TAU = 2. * PI;

vec4 quat(vec3 axis, float angle) {
  float halfAngle = angle / 2.;
  float s = sin( halfAngle );

  vec4 q = vec4(axis.x * s, axis.y * s, axis.z * s, cos( halfAngle ));
  return q;
}

vec3 applyQuat( vec4 q, vec3 v ){ 
	return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
}

vec3 getBasePoint(float alpha) {
  float r = 17.;
  vec3 p = vec3(r * cos(alpha), 0., r * sin(alpha));
  vec3 dir = vec3(cos(alpha+PI/2.), 0., sin(alpha+PI/2.));

  float a = 2.*alpha;
  p += applyQuat(quat(dir, a), vec3(0., 6., 0.));
  return p;
}

out vec3 pos;
out vec3 normal;

float parabola( float x, float k ) {
  return pow( 4. * x * ( 1. - x ), k );
}

void main() {
  float alpha = TAU * position.x / SEGMENTS;
  vec3 base = getBasePoint(alpha);
  vec3 prevBase = getBasePoint(alpha - TAU / SEGMENTS);
  vec3 dir = normalize(base - prevBase);

  float beta = TAU * position.y / SIDES;
  float tubeRadius = 1.;
  
  vec3 tubeDir = tubeRadius * vec3(0., 1., 0.);
  tubeDir = applyQuat(quat(dir, beta), tubeDir);
  vec3 newPosition = base + tubeDir;

  normal = normalMatrix * normalize(tubeDir);

  vec4 mvp = modelViewMatrix * vec4(newPosition, 1.);
  pos = mvp.xyz;
  gl_Position = projectionMatrix * mvp;
}
`;

const fragmentShader = `#version 300 es
precision highp float;

in vec3 pos;
in vec3 normal;

out vec4 color;

uniform sampler2D matCapMap;

void main() {
	// vec3 fdx = vec3( dFdx( pos.x ), dFdx( pos.y ), dFdx( pos.z ) );
	// vec3 fdy = vec3( dFdy( pos.x ), dFdy( pos.y ), dFdy( pos.z ) );
	// vec3 normal = normalize( cross( fdx, fdy ) );

  vec3 n = normalize(normal);
  vec3 eye = normalize(pos.xyz);
  vec3 r = reflect( eye, normal );
  float m = 2. * sqrt( pow( r.x, 2. ) + pow( r.y, 2. ) + pow( r.z + 1., 2. ) );
  vec2 vN = r.xy / m + .5;

  vec3 mat = texture(matCapMap, vN).rgb;

  color = vec4(mat, 1.);
  // color = vec4(1.,0.,1.,1.);
  // color = vec4(.5 + .5 * n, 1.);
}
`;

const SIDES = 20;
const SEGMENTS = 200;
const geometry = new BufferGeometry();

const indices = [];
const vertices = new Float32Array(SIDES * SEGMENTS * 3);

let ptr = 0;
for (let segment = 0; segment < SEGMENTS; segment++) {
  for (let side = 0; side < SIDES; side++) {
    vertices[ptr] = segment;
    vertices[ptr + 1] = side;
    vertices[ptr + 2] = 0;
    ptr += 3;
  }
}
const MAX = SEGMENTS * SIDES;
for (let segment = 0; segment < SEGMENTS + 1; segment++) {
  for (let f = 0; f < SIDES; f++) {
    const a = (segment * SIDES + ((f + 1) % SIDES)) % MAX;
    const b = (segment * SIDES + f) % MAX;
    const c = (segment * SIDES + f + SIDES) % MAX;
    const d = (segment * SIDES + ((f + 1) % SIDES) + SIDES) % MAX;

    indices.push(a, b, d);
    indices.push(b, c, d);
  }
}
geometry.setIndex(indices);
geometry.setAttribute("position", new BufferAttribute(vertices, 3));

// geometry.applyMatrix(new Matrix4().makeRotationX(Math.PI / 2));

const loader = new TextureLoader();
const matCapTexture = loader.load("matcap.png");

const geoMat = new RawShaderMaterial({
  uniforms: {
    SEGMENTS: { value: SEGMENTS },
    SIDES: { value: SIDES },
    matCapMap: { value: matCapTexture },
  },
  vertexShader,
  fragmentShader,
  // wireframe: true,
});

const g = new Group();
scene.add(g);

const TAU = 2 * Math.PI;

const cube = new Mesh(new BoxBufferGeometry(1, 1, 1), mat);
// scene.add(cube);

const meshes = [];
const N = 180;
const N2 = 1;
for (let i = 0; i < N2; i++) {
  const angle = (i * TAU) / N2;
  const t = new Mesh(geometry, geoMat);
  t.rotation.y = angle;
  g.add(t);
}
for (let i = 0; i < N; i++) {
  const p = i / N;
  const angle = p * TAU;
  for (let j = 0; j < N2; j++) {
    const v = new Vector3(6, 0, 0);
    v.applyEuler(new Euler(0, 0, angle * 2 + (j / N2) * TAU)); // spring like torsion
    v.add(new Vector3(17, 0, 0));
    v.applyEuler(new Euler(0, angle, 0));

    const mesh = new Mesh(
      geom,
      mat
      // j % 3 === 0 ? material : j % 3 === 1 ? material2 : material3
    );
    mesh.position.x = v.x;
    mesh.position.y = v.y + Math.sin(angle * 3) * 2; // ondulation on the main ring
    mesh.position.z = v.z;
    mesh.rotation.y = angle;
    // g.add(mesh);
    // meshes.push({ mesh, angle });
  }
}

const camera = new PerspectiveCamera(75, 1, 0.1, 150);
camera.position.set(0, 20, 30).multiplyScalar(1.05);
camera.lookAt(new Vector3(0, 0, 10));

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(1, 1);
document.body.append(renderer.domElement);

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

const controls = new OrbitControls(camera, renderer.domElement);
onResize();
window.addEventListener("resize", onResize);

function render() {
  renderer.setAnimationLoop(render);
  renderer.render(scene, camera);
}
render();

// // createScene must return a function to update the scene
// return (s, t) => {
//   meshes.forEach(({ mesh, angle }) => {
//     const s = (Math.max(0, Math.sin(angle * 3 + t * TAU) + 1.2) ** 2) * 0.3
//     mesh.scale.copy(new Vector3(s, s, s))
//   })

//   renderer.render(scene, camera)

//   // the update function must return the renderer
//   return renderer
// }
