import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

let scene, camera, renderer, controls, composer;
let clock = new THREE.Clock();
let flame, candleLight, cakeGroup, sparkles, smokeParticles, confettiParticles;
let photoFrames = [];
let flowers = [];
let raycaster, mouse;
let intersectedFrame = null;
let celebrationTimeout;
let audioListener, backgroundMusic, blowSound, confettiSound, sparkleSound;
let isMusicPlaying = false;

const baseLightIntensity = 1;
const cakeBaseY = 1.1;
const isMobile = window.innerWidth <= 768;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0a2a);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Audio
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    loadAudio();

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffc0cb, 0.2);
    scene.add(ambientLight);

    candleLight = new THREE.PointLight(0xff9f4f, baseLightIntensity, 100);
    candleLight.castShadow = true;
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Table
    const tableGroup = new THREE.Group();
    const tableTopGeo = new THREE.CylinderGeometry(2, 2, 0.1, 64);
    const tableTopMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    const tableLegGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 32);
    const tableLegMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const tableLeg = new THREE.Mesh(tableLegGeo, tableLegMat);
    tableLeg.position.y = -0.55;
    tableLeg.castShadow = true;
    tableGroup.add(tableTop, tableLeg);
    tableGroup.position.y = 0.5;
    scene.add(tableGroup);

    // Cake
    cakeGroup = new THREE.Group();
    const cakeBaseGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 64);
    const cakeBaseMat = new THREE.MeshStandardMaterial({ color: 0xffc0cb });
    const cakeBase = new THREE.Mesh(cakeBaseGeo, cakeBaseMat);
    cakeBase.castShadow = true;
    cakeBase.receiveShadow = true;
    const cakeTopGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 64);
    const cakeTopMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const cakeTop = new THREE.Mesh(cakeTopGeo, cakeTopMat);
    cakeTop.position.y = 0.4;
    cakeTop.castShadow = true;
    cakeTop.receiveShadow = true;
    cakeGroup.add(cakeBase, cakeTop);
    cakeGroup.position.y = cakeBaseY;
    scene.add(cakeGroup);

    // Candle & Flame
    const candleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 16);
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xf0e68c });
    const candle = new THREE.Mesh(candleGeo, candleMat);
    candle.position.set(0, 0.7, 0);
    cakeGroup.add(candle);
    const flameGeo = new THREE.ConeGeometry(0.03, 0.1, 16);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 2 });
    flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0.85, 0);
    cakeGroup.add(flame);
    cakeGroup.add(candleLight);
    candleLight.position.set(0, 0.9, 0);

    // Photo Frames
    const framePositions = [
        { x: -1.5, y: 1.2, z: 0, ry: Math.PI / 4 }, { x: 1.5, y: 1.3, z: 0, ry: -Math.PI / 4 },
        { x: 0, y: 1.4, z: -1.5, ry: 0 }, { x: -1, y: 1.5, z: -1, ry: Math.PI / 8 },
        { x: 1, y: 1.1, z: -1, ry: -Math.PI / 8 },
    ];
    const frameGeo = new THREE.BoxGeometry(0.5, 0.7, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    framePositions.forEach(pos => {
        const frame = new THREE.Mesh(frameGeo, frameMat.clone());
        frame.position.set(pos.x, pos.y, pos.z);
        frame.rotation.y = pos.ry;
        frame.castShadow = true;
        frame.userData.baseY = pos.y;
        scene.add(frame);
        photoFrames.push(frame);
    });

    // Flowers
    const flowerGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, emissive: 0x330000 });
    const flowerPositions = [ { x: -1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: 0, y: 1, z: -2 }];
    flowerPositions.forEach(pos => {
        const flower = new THREE.Mesh(flowerGeo, flowerMat);
        flower.position.set(pos.x, pos.y, pos.z);
        flower.castShadow = true;
        flower.userData.baseY = pos.y;
        scene.add(flower);
        flowers.push(flower);
    });

    // Particles
    const sparkleCount = isMobile ? 250 : 500;
    const sparkleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount * 3; i++) posArray[i] = (Math.random() - 0.5) * 10;
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const sparkleMat = new THREE.PointsMaterial({ size: 0.02, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkles);

    // Post-processing
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = isMobile ? 0.4 : 0.6;
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);
    const bokehPass = new BokehPass(scene, camera, { focus: 4.5, aperture: 0.0005, maxblur: 0.01 });
    composer.addPass(bokehPass);

    // Event Listeners
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('click', onClick);
    setupUI();
    animate();
}

function loadAudio() {
    const audioLoader = new THREE.AudioLoader();
    backgroundMusic = new THREE.Audio(audioListener);
    audioLoader.load('assets/audio/background_music.mp3', buffer => {
        backgroundMusic.setBuffer(buffer);
        backgroundMusic.setLoop(true);
        backgroundMusic.setVolume(0.3);
    });
    blowSound = new THREE.Audio(audioListener);
    audioLoader.load('assets/audio/blow.mp3', buffer => blowSound.setBuffer(buffer));
    confettiSound = new THREE.Audio(audioListener);
    audioLoader.load('assets/audio/confetti.mp3', buffer => confettiSound.setBuffer(buffer));
    sparkleSound = new THREE.Audio(audioListener);
    audioLoader.load('assets/audio/sparkle.mp3', buffer => sparkleSound.setBuffer(buffer));
}

function setupUI() {
    const musicToggle = document.getElementById('music-toggle');
    const musicOn = document.getElementById('music-on');
    const musicOff = document.getElementById('music-off');
    musicToggle.addEventListener('click', () => {
        if (isMusicPlaying) {
            backgroundMusic.pause();
            musicOn.style.display = 'none';
            musicOff.style.display = 'block';
        } else {
            backgroundMusic.play();
            musicOn.style.display = 'block';
            musicOff.style.display = 'none';
        }
        isMusicPlaying = !isMusicPlaying;
    });

    const micButton = document.createElement('button');
    micButton.textContent = 'Enable Mic to Blow';
    micButton.id = 'mic-button';
    Object.assign(micButton.style, {
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        padding: '10px 20px', background: 'rgba(255,255,255,0.2)', border: '1px solid white',
        color: 'white', cursor: 'pointer', borderRadius: '5px'
    });
    document.body.appendChild(micButton);
    micButton.addEventListener('click', () => {
        setupMicDetection();
        micButton.style.display = 'none';
    });
}

let audioContext, analyser, dataArray;
function setupMicDetection() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 32;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            source.connect(analyser);
        }).catch(err => console.error("Microphone access denied:", err));
}

function updateMicLevel() {
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    if (average > 100) blowOutCandle();
}

function blowOutCandle() {
    if (!flame.visible) return;
    flame.visible = false;
    if (blowSound && blowSound.buffer) blowSound.play();
    clearTimeout(celebrationTimeout);
    gsap.to(candleLight, { intensity: 0, duration: 0.5 });
    createSmoke();
    celebrationTimeout = setTimeout(startCelebration, 500);
}

function startCelebration() {
    if (confettiSound && confettiSound.buffer) confettiSound.play();
    if (sparkleSound && sparkleSound.buffer) sparkleSound.play();
    createConfetti();
    flowers.forEach(flower => gsap.to(flower.material.emissive, { r: 0.8, g: 0.2, b: 0.3, duration: 1.5, ease: "power2.out" }));
    gsap.to(sparkles.material, { size: 0.04, duration: 1.5, ease: "power2.out" }).yoyo(true).repeat(1);

    const fontLoader = new FontLoader();
    fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', 
        font => {
            const textGeo = new TextGeometry('18', { font, size: 0.5, height: 0.1 });
            textGeo.center();
            const textMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, emissive: 0xff1493, emissiveIntensity: 1, metalness: 0.8, roughness: 0.4 });
            const ageText = new THREE.Mesh(textGeo, textMat);
            ageText.position.set(0, 1.5, 0);
            ageText.scale.set(0.01, 0.01, 0.01);
            scene.add(ageText);
            gsap.to(ageText.scale, { x: 1, y: 1, z: 1, duration: 2, ease: "elastic.out(1, 0.5)" });
            gsap.to(ageText.rotation, { y: Math.PI * 2, duration: 3, ease: "power2.inOut" });
        },
        undefined, // onProgress callback
        (error) => console.error('Font could not be loaded.', error) // onError callback
    );

    gsap.to(camera.position, { z: 3.5, duration: 3, ease: "power2.inOut" });
    const finalMsgContainer = document.getElementById('final-message-container');
    const finalMsg = document.getElementById('final-message');
    finalMsg.textContent = "Happy 18th Birthday My Love ❤️";
    finalMsgContainer.style.display = 'block';
    gsap.to(finalMsg, { opacity: 1, y: 0, duration: 1.5, delay: 2 });
}

function createParticleSystem(config) {
    const geo = new THREE.BufferGeometry();
    const posArray = new Float32Array(config.count * 3);
    const velArray = new Float32Array(config.count * 3);
    const colorArray = config.vertexColors ? new Float32Array(config.count * 3) : null;

    for (let i = 0; i < config.count; i++) {
        const i3 = i * 3;
        posArray[i3] = config.origin.x;
        posArray[i3 + 1] = config.origin.y;
        posArray[i3 + 2] = config.origin.z;
        config.setupVelocity(velArray, i3);
        if (colorArray) config.setupColor(colorArray, i3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velArray, 3));
    if (colorArray) geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    
    const mat = new THREE.PointsMaterial(config.material);
    const particles = new THREE.Points(geo, mat);
    config.parent.add(particles);
    return particles;
}

function createSmoke() {
    smokeParticles = createParticleSystem({
        count: 50,
        origin: { x: 0, y: 0.85, z: 0 },
        parent: cakeGroup,
        material: { size: 0.1, color: 0xaaaaaa, transparent: true, opacity: 0.5, blending: THREE.NormalBlending, depthWrite: false },
        setupVelocity: (arr, i3) => {
            arr[i3] = (Math.random() - 0.5) * 0.01;
            arr[i3 + 1] = Math.random() * 0.05 + 0.02;
            arr[i3 + 2] = (Math.random() - 0.5) * 0.01;
        }
    });
}

function createConfetti() {
    const colors = [new THREE.Color(0xffc0cb), new THREE.Color(0xff69b4), new THREE.Color(0xffd700)];
    confettiParticles = createParticleSystem({
        count: isMobile ? 800 : 2000,
        origin: { x: 0, y: 1.5, z: 0 },
        parent: scene,
        vertexColors: true,
        material: { size: 0.02, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false },
        setupVelocity: (arr, i3) => {
            arr[i3] = (Math.random() - 0.5) * 0.1;
            arr[i3 + 1] = Math.random() * 0.15 + 0.05;
            arr[i3 + 2] = (Math.random() - 0.5) * 0.1;
        },
        setupColor: (arr, i3) => {
            colors[Math.floor(Math.random() * colors.length)].toArray(arr, i3);
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) { updateMouse(event.clientX, event.clientY); }
function onTouchStart(event) { if (event.touches.length > 0) updateMouse(event.touches[0].clientX, event.touches[0].clientY); }
function onClick() {
    raycaster.setFromCamera(mouse, camera);
    if (raycaster.intersectObject(flame).length > 0) blowOutCandle();
}
function updateMouse(x, y) {
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;
}

function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photoFrames);
    if (intersects.length > 0) {
        if (intersectedFrame !== intersects[0].object) {
            if (intersectedFrame) intersectedFrame.material.color.set(0xffffff);
            intersectedFrame = intersects[0].object;
            intersectedFrame.material.color.set(0xffc0cb);
        }
    } else {
        if (intersectedFrame) intersectedFrame.material.color.set(0xffffff);
        intersectedFrame = null;
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Animations
    if (cakeGroup) cakeGroup.position.y = cakeBaseY + Math.sin(elapsedTime * 0.5) * 0.05;
    photoFrames.forEach((frame, i) => {
        frame.position.y = frame.userData.baseY + Math.sin(elapsedTime * 0.6 + i) * 0.05;
        const targetZ = (frame === intersectedFrame) ? frame.position.z + 0.2 : frame.position.z;
        const targetRotX = (frame === intersectedFrame) ? 0.2 : 0;
        frame.position.z += (targetZ - frame.position.z) * 0.1;
        frame.rotation.x += (targetRotX - frame.rotation.x) * 0.1;
    });
    flowers.forEach((f, i) => {
        f.position.y = f.userData.baseY + Math.sin(elapsedTime * 0.4 + i) * 0.1;
        f.rotation.x = Math.sin(elapsedTime * 0.3 + i) * 0.2;
        f.rotation.z = Math.cos(elapsedTime * 0.3 + i) * 0.2;
    });
    if (flame && flame.visible) {
        const flicker = Math.random() * 0.08;
        flame.scale.y = 1 + Math.sin(elapsedTime * 30) * 0.2 + flicker;
        flame.scale.x = 1 + Math.sin(elapsedTime * 20) * 0.1 + flicker;
        flame.position.x = Math.sin(elapsedTime * 5) * 0.005;
        if (candleLight) candleLight.intensity = baseLightIntensity * (1 - flicker * 8);
    }
    if (smokeParticles) {
        const pos = smokeParticles.geometry.attributes.position;
        const vel = smokeParticles.geometry.attributes.velocity;
        for (let i = 0; i < pos.count; i++) {
            const i3 = i * 3;
            pos.array[i3] += vel.array[i3];
            pos.array[i3 + 1] += vel.array[i3 + 1];
            pos.array[i3 + 2] += vel.array[i3 + 2];
        }
        pos.needsUpdate = true;
        smokeParticles.material.opacity -= 0.005;
        if (smokeParticles.material.opacity <= 0) {
            cakeGroup.remove(smokeParticles);
            smokeParticles = null;
        }
    }
    if (confettiParticles) {
        const pos = confettiParticles.geometry.attributes.position;
        const vel = confettiParticles.geometry.attributes.velocity;
        for (let i = 0; i < pos.count; i++) {
            vel.array[i * 3 + 1] -= 0.001; // Gravity
            pos.array[i * 3] += vel.array[i * 3];
            pos.array[i * 3 + 1] += vel.array[i * 3 + 1];
            pos.array[i * 3 + 2] += vel.array[i * 3 + 2];
        }
        pos.needsUpdate = true;
        confettiParticles.material.opacity -= 0.002;
        if (confettiParticles.material.opacity <= 0) {
            scene.remove(confettiParticles);
            confettiParticles = null;
        }
    }
    if (sparkles) {
        sparkles.rotation.y = elapsedTime * 0.1;
        const pos = sparkles.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.array[i * 3 + 1] += Math.sin(elapsedTime + i) * 0.001;
        }
        pos.needsUpdate = true;
    }

    updateMicLevel();
    checkIntersection();
    controls.update(delta);
    composer.render();
}

init();