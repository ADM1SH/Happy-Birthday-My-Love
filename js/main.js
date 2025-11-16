import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

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

const baseLightIntensity = 1.5;
const cakeBaseY = 0.55;
const isMobile = window.innerWidth <= 768;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0a2a);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2.5, 3.5);

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
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;

    // Lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffc0cb, 0x663399, 0.6); // Pink sky, purple ground, slightly reduced intensity
    scene.add(hemisphereLight);

    // Add a main directional light to brighten the whole scene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // White light, strong intensity
    directionalLight.position.set(-5, 10, 5);
    directionalLight.castShadow = true;
    // Configure shadow properties for the directional light for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    const light1 = new THREE.PointLight(0xadd8e6, 1.0, 60); // Adjusted intensity
    light1.position.set(-4, 2.5, -3);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xffb6c1, 1.0, 60); // Adjusted intensity
    light2.position.set(4, 3, 2);
    scene.add(light2);

    candleLight = new THREE.PointLight(0xff9f4f, baseLightIntensity, 100);
    candleLight.castShadow = true;
    candleLight.shadow.mapSize.width = 2048;
    candleLight.shadow.mapSize.height = 2048;
    candleLight.shadow.bias = -0.0005;

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floor = new Reflector(floorGeometry, {
        clipBias: 0.003,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: 0x777777
    });
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // Table
    const tableGroup = new THREE.Group();
    const tableTopGeo = new THREE.CylinderGeometry(2, 2, 0.1, 64);
    const tableMat = new THREE.MeshStandardMaterial({ 
        color: 0x654321, // Darker wood color
        roughness: 0.3, 
        metalness: 0.1 
    });
    const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    const tableLegGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 32);
    const tableLeg = new THREE.Mesh(tableLegGeo, tableMat); // Reuse the same material
    tableLeg.position.y = -0.55;
    tableLeg.castShadow = true;
    tableLeg.receiveShadow = true; // Leg should also receive shadows
    tableGroup.add(tableTop, tableLeg);
    tableGroup.position.y = 0.5;
    scene.add(tableGroup);

    // Cake
    cakeGroup = new THREE.Group();
    // Base layer
    const cakeBaseGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 64);
    const cakeBaseMat = new THREE.MeshStandardMaterial({ color: 0xd2691e, roughness: 0.8 }); // Chocolate brown, rough
    const cakeBase = new THREE.Mesh(cakeBaseGeo, cakeBaseMat);
    cakeBase.castShadow = true;
    cakeBase.receiveShadow = true;
    // Top layer (frosting)
    const cakeTopGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 64);
    const cakeTopMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 }); // White, slightly glossy
    const cakeTop = new THREE.Mesh(cakeTopGeo, cakeTopMat);
    cakeTop.position.y = 0.4;
    cakeTop.castShadow = true;
    cakeTop.receiveShadow = true;
    cakeGroup.add(cakeBase, cakeTop);

    // Add decorative frosting pearls
    const pearlGeo = new THREE.SphereGeometry(0.03, 16, 16);
    const pearlMat = new THREE.MeshStandardMaterial({ color: 0xffc0cb });
    for (let i = 0; i < 360; i += 15) {
        const angle = THREE.MathUtils.degToRad(i);
        // Pearls on base layer
        const pearl1 = new THREE.Mesh(pearlGeo, pearlMat);
        pearl1.position.set(Math.cos(angle) * 0.8, 0.2, Math.sin(angle) * 0.8);
        cakeGroup.add(pearl1);
        // Pearls on top layer
        if (i % 30 === 0) { // Fewer pearls on top
            const pearl2 = new THREE.Mesh(pearlGeo, pearlMat);
            pearl2.position.set(Math.cos(angle) * 0.5, 0.6, Math.sin(angle) * 0.5);
            cakeGroup.add(pearl2);
        }
    }

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
        { x: 1.2, y: 0.9, z: 0.8, ry: -Math.PI / 8, rx: -0.15 },
        { x: -1.2, y: 0.9, z: 0.8, ry: Math.PI / 8, rx: -0.15 },
        { x: 0.7, y: 0.9, z: 1.3, ry: -Math.PI / 16, rx: -0.15 },
        { x: -0.7, y: 0.9, z: 1.3, ry: Math.PI / 16, rx: -0.15 },
        { x: 0, y: 0.9, z: 1.5, ry: 0, rx: -0.15 }
    ];
    const frameGeo = new THREE.BoxGeometry(0.5, 0.7, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    framePositions.forEach(pos => {
        const frame = new THREE.Mesh(frameGeo, frameMat.clone());
        frame.position.set(pos.x, pos.y, pos.z);
        frame.rotation.y = pos.ry;
        frame.rotation.x = pos.rx || 0; // Add x rotation for flat frames
        frame.castShadow = true;
        frame.userData.baseY = pos.y;
        scene.add(frame);
        photoFrames.push(frame);
    });

function createLilyOfTheValley() {
        const group = new THREE.Group();

        // Stem
        const stemCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.1, 0.4, 0),
            new THREE.Vector3(-0.1, 0.8, 0.1)
        ]);
        const stemGeo = new THREE.TubeGeometry(stemCurve, 20, 0.02, 8, false);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x008000 }); // Green
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.castShadow = true;
        group.add(stem);

        // Flower Bells (using cones)
        const bellGeo = new THREE.ConeGeometry(0.05, 0.1, 8);
        const bellMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White

        const numBells = 5;
        for (let i = 0; i < numBells; i++) {
            const bell = new THREE.Mesh(bellGeo, bellMat.clone()); // Use clone to have separate materials for animation
            const t = 0.4 + (i / numBells) * 0.6; // Position along the stem
            const pos = stemCurve.getPointAt(t);
            bell.position.copy(pos);
            
            // Make bells hang down
            bell.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
            bell.rotation.z = (Math.random() - 0.5) * 0.5;

            bell.castShadow = true;
            group.add(bell);
        }
        return group;
    }

    function createVaseWithFlowers() {
    const vaseGroup = new THREE.Group();

    // Create Vase
    const vaseProfile = [
        new THREE.Vector2(0.0, -0.4), new THREE.Vector2(0.25, -0.35),
        new THREE.Vector2(0.2, -0.2), new THREE.Vector2(0.1, 0.0),
        new THREE.Vector2(0.15, 0.3), new THREE.Vector2(0.2, 0.35)
    ];
    const vaseGeo = new THREE.LatheGeometry(vaseProfile, 20);
    const vaseMat = new THREE.MeshStandardMaterial({ color: 0xB0E0E6, roughness: 0.2, metalness: 0.1 });
    const vase = new THREE.Mesh(vaseGeo, vaseMat);
    vase.castShadow = true;
    vase.receiveShadow = true;
    vaseGroup.add(vase);

    // Add 2 flowers to the vase
    const lily1 = createLilyOfTheValley();
    lily1.scale.set(0.6, 0.6, 0.6);
    lily1.position.set(0.05, 0.15, 0);
    lily1.rotation.y = Math.random() * Math.PI;
    vaseGroup.add(lily1);

    const lily2 = createLilyOfTheValley();
    lily2.scale.set(0.6, 0.6, 0.6);
    lily2.position.set(-0.05, 0.15, 0.05);
    lily2.rotation.y = Math.random() * Math.PI;
    vaseGroup.add(lily2);
    
    return vaseGroup;
}

// Flowers in Vases
    const vasePositions = [ 
        { x: -1.5, y: 0.87, z: 1.5, s: 0.8 }, // y = 0.55 + 0.4 * 0.8
        { x: 1.5, y: 0.87, z: 1.5, s: 0.8 }, // y = 0.55 + 0.4 * 0.8
        { x: 1.8, y: 0.83, z: -0.5, s: 0.7 }, // y = 0.55 + 0.4 * 0.7
        { x: -1.8, y: 0.83, z: -0.5, s: 0.7 }, // y = 0.55 + 0.4 * 0.7
        { x: 0, y: 0.91, z: -2.2, s: 0.9 }  // y = 0.55 + 0.4 * 0.9
    ];vasePositions.forEach(pos => {
    const vaseOfFlowers = createVaseWithFlowers();
    vaseOfFlowers.position.set(pos.x, pos.y, pos.z);
    vaseOfFlowers.scale.set(pos.s, pos.s, pos.s);
    vaseOfFlowers.userData.baseY = pos.y;
    scene.add(vaseOfFlowers);
    flowers.push(vaseOfFlowers); // Re-using the 'flowers' array for the vase groups
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
    bloomPass.threshold = 0.1;
    bloomPass.strength = isMobile ? 0.2 : 0.3;
    bloomPass.radius = 0.3;
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
    flowers.forEach(vaseGroup => { // 'flowers' array now contains vaseGroups
        vaseGroup.children.forEach(item => {
            if (item.type === 'Group') { // This is a lily of the valley group
                item.children.forEach(child => { // This is a stem or a bell
                    if (child.isMesh && child.material.color.getHexString() === 'ffffff') { // This is a bell
                        gsap.to(child.material.emissive, { r: 0.8, g: 0.8, b: 0.2, duration: 1.5, ease: "power2.out" });
                    }
                });
            }
        });
    });
    gsap.to(sparkles.material, { size: 0.04, duration: 1.5, ease: "power2.out" }).yoyo(true).repeat(1);

    const fontLoader = new FontLoader();
    fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', 
        font => {
            const textGeo = new TextGeometry('18', { font, size: 0.5, height: 0.1 });
            textGeo.center();
            const textMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, emissive: 0xff1493, emissiveIntensity: 1, metalness: 0.8, roughness: 0.4 });
            const ageText = new THREE.Mesh(textGeo, textMat);
            ageText.position.set(0, 2.2, 0);
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
    // Photo frame animation disabled to keep them static.
    flowers.forEach((f, i) => {
        f.position.y = f.userData.baseY + Math.sin(elapsedTime * 0.4 + i) * 0.05;
        f.rotation.y += Math.sin(elapsedTime * 0.3 + i) * 0.002;
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