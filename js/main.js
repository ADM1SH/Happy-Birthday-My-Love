import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { MeshPhysicalMaterial } from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';

// --- CONFIGURATION ---
const isMobile = window.innerWidth <= 768;

const config = {
    isMobile: isMobile,
    cakeBaseY: 0.55,
    lightIntensity: {
        base: isMobile ? 1.8 : 2.2,
        hemisphere: isMobile ? 1.4 : 1.6,
        directional: isMobile ? 1.2 : 1.4,
        point1: isMobile ? 1.5 : 1.7,
        point2: isMobile ? 1.5 : 1.7,
    },
    shadowMapSize: window.innerWidth <= 768 ? 1024 : 2048,
    bloom: {
        strength: isMobile ? 0.4 : 0.45,
        radius: isMobile ? 0.2 : 0.35,
        threshold: 0.1,
    },
    bokeh: {
        focus: 4.5,
        aperture: 0.0005,
        maxblur: window.innerWidth <= 768 ? 0.005 : 0.01,
    },
    particles: {
        sparkleCount: window.innerWidth <= 768 ? 200 : 500,
        confettiCount: window.innerWidth <= 768 ? 500 : 2000,
    },
    micSensitivity: 100,
    geometryDetail: window.innerWidth <= 768 ? 32 : 64,
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
};

// --- STATE ---
const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    composer: null,
    clock: new THREE.Clock(),
    flame: null,
    candleLight: null,
    cakeGroup: null,
    sparkles: null,
    smokeParticles: null,
    confettiParticles: null,
    photoFrames: [],
    flowers: [],
    balloons: [],
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    intersectedFrame: null,
    celebrationTimeout: null,
    loadingManager: null,
    audio: {
        listener: null,
        blowSound: null,
        confettiSound: null,
        sparkleSound: null,
    },
    mic: {
        audioContext: null,
        analyser: null,
        dataArray: null,
    }
};

init();
animate();

function init() {
    state.loadingManager = new THREE.LoadingManager();
    const progressBar = document.getElementById('loading-progress-bar');
    const loadingScreen = document.getElementById('loading-screen');
    const loadingMessage = document.getElementById('loading-message');

    const loadingMessages = [
        "Baking the cake...",
        "Placing the photos...",
        "Lighting the candles...",
        "Blowing up the balloons...",
        "Getting everything ready..."
    ];

    const startTime = Date.now();
    const minDisplayTime = 3000; // 3 seconds

    state.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const progress = itemsLoaded / itemsTotal;
        progressBar.style.width = progress * 100 + '%';

        const messageIndex = Math.floor(progress * (loadingMessages.length - 1));
        loadingMessage.textContent = loadingMessages[messageIndex];
    };

    state.loadingManager.onLoad = () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, remainingTime);
    };

    state.loadingManager.onError = (url) => {
        console.error('There was an error loading ' + url);
    };

    setupScene();
    setupCamera();
    setupRenderer();
    setupAudio();
    setupControls();
    setupLights();
    createTable();
    createCake();
    createPhotoFrames();
    createVasesWithFlowers();
    createBalloons();
    createSparkles();
    setupPostProcessing();
    setupEventListeners();
    setupUI();
}

function setupScene() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x000000);
}

function setupCamera() {
    state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    if (config.isMobile) {
        state.camera.position.set(0, 2.5, 6.5); // Move camera back on mobile
    } else {
        state.camera.position.set(0, 2.5, 3.5);
    }
}

function setupRenderer() {
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(config.pixelRatio);
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer.outputEncoding = THREE.sRGBEncoding;
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(state.renderer.domElement);
}

function setupAudio() {
    state.audio.listener = new THREE.AudioListener();
    state.camera.add(state.audio.listener);
    loadAudio();
}

function loadAudio() {
    const audioLoader = new THREE.AudioLoader(state.loadingManager);
    state.audio.blowSound = new THREE.Audio(state.audio.listener);
    // audioLoader.load('assets/audio/blow.mp3', buffer => state.audio.blowSound.setBuffer(buffer));
    state.audio.confettiSound = new THREE.Audio(state.audio.listener);
    // audioLoader.load('assets/audio/confetti.mp3', buffer => state.audio.confettiSound.setBuffer(buffer));
    state.audio.sparkleSound = new THREE.Audio(state.audio.listener);
    // audioLoader.load('assets/audio/sparkle.mp3', buffer => state.audio.sparkleSound.setBuffer(buffer));
}

function setupControls() {
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.target.set(0, 1, 0);
    state.controls.enableDamping = true;
    state.controls.autoRotate = false;
    state.controls.autoRotateSpeed = 0.5;
}

function setupLights() {
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, config.lightIntensity.hemisphere * 0.5);
    state.scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, config.lightIntensity.directional * 0.5);
    directionalLight.position.set(-5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = config.shadowMapSize;
    directionalLight.shadow.mapSize.height = config.shadowMapSize;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    state.scene.add(directionalLight);

    const light1 = new THREE.PointLight(0x00FFFF, config.lightIntensity.point1 * 0.5, 60);
    light1.position.set(-4, 2.5, -3);
    state.scene.add(light1);

    const light2 = new THREE.PointLight(0xFF00FF, config.lightIntensity.point2 * 0.5, 60);
    light2.position.set(4, 3, 2);
    state.scene.add(light2);

    state.candleLight = new THREE.PointLight(0xff9f4f, config.lightIntensity.base * 0.5, 100);
    state.candleLight.castShadow = true;
    state.candleLight.shadow.mapSize.width = config.shadowMapSize;
    state.candleLight.shadow.mapSize.height = config.shadowMapSize;
    state.candleLight.shadow.bias = -0.0005;
}

function createTable() {
    const tableGroup = new THREE.Group();
    const tableTopGeo = new THREE.CylinderGeometry(2, 2, 0.1, config.geometryDetail);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.3, metalness: 0.1 });
    const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    const tableLegGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, config.geometryDetail / 2);
    const tableLeg = new THREE.Mesh(tableLegGeo, tableMat);
    tableLeg.position.y = -0.55;
    tableLeg.castShadow = true;
    tableLeg.receiveShadow = true;
    tableGroup.add(tableTop, tableLeg);
    tableGroup.position.y = 0.5;
    state.scene.add(tableGroup);
}

function createCake() {
    state.cakeGroup = new THREE.Group();
    
    const cakeBaseGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.4, config.geometryDetail);
    const cakeBaseMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const cakeBase = new THREE.Mesh(cakeBaseGeo, cakeBaseMat);
    cakeBase.castShadow = true;
    cakeBase.receiveShadow = true;
    
    const cakeTopGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.8, config.geometryDetail);
    const textureLoader = new THREE.TextureLoader(state.loadingManager);
    const icingTexture = textureLoader.load('assets/images/IMG_2376.jpeg');
    icingTexture.wrapS = THREE.RepeatWrapping;
    icingTexture.repeat.x = 3;
    const cakeTopMat = new THREE.MeshStandardMaterial({ map: icingTexture, roughness: 0.5, metalness: 0.1 });
    const cakeTop = new THREE.Mesh(cakeTopGeo, cakeTopMat);
    cakeTop.rotation.y = Math.PI / 2;
    cakeTop.position.y = 0.6;
    cakeTop.castShadow = true;
    cakeTop.receiveShadow = true;
    state.cakeGroup.add(cakeBase, cakeTop);

    const pearlGeo = new THREE.SphereGeometry(0.03, config.geometryDetail / 4, config.geometryDetail / 4);
    const pearlMat = new THREE.MeshStandardMaterial({ color: 0xFFB6C1 });
    for (let i = 0; i < 360; i += 15) {
        const angle = THREE.MathUtils.degToRad(i);
        const pearl1 = new THREE.Mesh(pearlGeo, pearlMat);
        pearl1.position.set(Math.cos(angle) * 0.8, 0.2, Math.sin(angle) * 0.8);
        state.cakeGroup.add(pearl1);
        if (i % 30 === 0) {
            const pearl2 = new THREE.Mesh(pearlGeo, pearlMat);
            pearl2.position.set(Math.cos(angle) * 0.5, 0.25, Math.sin(angle) * 0.5);
            state.cakeGroup.add(pearl2);
        }
    }

    state.cakeGroup.position.y = config.cakeBaseY;
    state.cakeGroup.scale.set(1.2, 1.2, 1.2);
    state.scene.add(state.cakeGroup);

    createCandle();
}

function createCandle() {
    const candleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, config.geometryDetail / 4);
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xF5F5DC });
    const candle = new THREE.Mesh(candleGeo, candleMat);
    candle.position.set(0, 1.1, 0);
    state.cakeGroup.add(candle);

    const flameGeo = new THREE.ConeGeometry(0.03, 0.1, config.geometryDetail / 4);
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xFFA500, emissive: 0xFF4500, emissiveIntensity: 2 });
    state.flame = new THREE.Mesh(flameGeo, flameMat);
    state.flame.position.set(0, 1.25, 0);
    state.cakeGroup.add(state.flame);

    state.cakeGroup.add(state.candleLight);
    state.candleLight.position.set(0, 1.3, 0);
}

function createPhotoFrames() {
    const textureLoaderPhoto = new THREE.TextureLoader(state.loadingManager);
    const photoTextures = [
        textureLoaderPhoto.load('assets/images/Screenshot 2025-11-20 at 10.39.25 AM.png'),
        textureLoaderPhoto.load('assets/images/IMG_2520.jpeg'),
        textureLoaderPhoto.load('assets/images/IMG_3146.JPG'),
        textureLoaderPhoto.load('assets/images/IMG_2854.JPG'),
        textureLoaderPhoto.load('assets/images/IMG_2847.jpeg')
    ];

    const framePositions = [
        { x: 0, y: 2.5, z: -2.5, ry: 0, rx: 0 },
        { x: 2, y: 1.5, z: -2, ry: -Math.PI / 8, rx: 0 },
        { x: -2, y: 1.5, z: -2, ry: Math.PI / 8, rx: 0 },
        { x: 3, y: 1.2, z: -1, ry: -Math.PI / 4, rx: 0 },
        { x: -3, y: 1.2, z: -1, ry: Math.PI / 4, rx: 0 }
    ];

    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7, metalness: 0.2 });

    for (const [i, pos] of framePositions.entries()) {
        const frameGroup = new THREE.Group();

        const frameBorderGeo = new THREE.BoxGeometry(0.55, 0.75, 0.05);
        const frameBorder = new THREE.Mesh(frameBorderGeo, frameMaterial);
        frameBorder.castShadow = true;
        frameGroup.add(frameBorder);

        const pictureGeo = new THREE.PlaneGeometry(0.5, 0.7);
        const pictureMat = new THREE.MeshStandardMaterial({
            map: photoTextures[i % photoTextures.length],
            side: THREE.DoubleSide
        });
        const picture = new THREE.Mesh(pictureGeo, pictureMat);
        picture.position.z = 0.026;
        frameGroup.add(picture);

        frameGroup.position.set(pos.x, pos.y, pos.z);
        frameGroup.rotation.y = pos.ry;
        frameGroup.rotation.x = pos.rx || 0;
        frameGroup.userData.baseY = pos.y;
        frameGroup.userData.photoTexture = photoTextures[i % photoTextures.length];

        state.scene.add(frameGroup);
        state.photoFrames.push(frameGroup);
    }
}

function createLilyOfTheValley(color) {
    const group = new THREE.Group();

    const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.1, 0.4, 0),
        new THREE.Vector3(-0.1, 0.8, 0.1)
    ]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 20, 0.02, Math.round(config.geometryDetail / 8), false);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x556B2F });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.castShadow = true;
    group.add(stem);

    const bellProfile = [
        new THREE.Vector2(0.00, 0.0),
        new THREE.Vector2(0.05, 0.02),
        new THREE.Vector2(0.04, 0.08),
        new THREE.Vector2(0.02, 0.1),
        new THREE.Vector2(0.00, 0.1)
    ];
    const bellGeo = new THREE.LatheGeometry(bellProfile, Math.round(config.geometryDetail / 4));
    const bellMat = new THREE.MeshStandardMaterial({ color: color || 0xFFFFF0 });

    const numBells = 5;
    for (let i = 0; i < numBells; i++) {
        const bell = new THREE.Mesh(bellGeo, bellMat.clone());
        const t = 0.4 + (i / numBells) * 0.6;
        const pos = stemCurve.getPointAt(t);
        bell.position.copy(pos);
        
        bell.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        bell.rotation.z = (Math.random() - 0.5) * 0.5;

        bell.castShadow = true;
        group.add(bell);
    }
    return group;
}

function createVaseWithFlowers() {
    const vaseGroup = new THREE.Group();

    const vaseProfile = [
        new THREE.Vector2(0.0, -0.4), 
        new THREE.Vector2(0.2, -0.35),
        new THREE.Vector2(0.25, -0.2), 
        new THREE.Vector2(0.15, 0.0),
        new THREE.Vector2(0.1, 0.2), 
        new THREE.Vector2(0.12, 0.4)
    ];
    const vaseGeo = new THREE.LatheGeometry(vaseProfile, Math.round(config.geometryDetail / 2));
    const vaseMat = new THREE.MeshStandardMaterial({
        color: 0xB2DFDB, // A nice teal/cyan color
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.5
    });
    const vase = new THREE.Mesh(vaseGeo, vaseMat);
    vase.castShadow = true;
    vase.receiveShadow = true;
    vaseGroup.add(vase);

    const lily1 = createLilyOfTheValley(0xFFE4E1); // Misty Rose
    lily1.scale.set(0.6, 0.6, 0.6);
    lily1.position.set(0.05, 0.15, 0);
    lily1.rotation.y = Math.random() * Math.PI;
    vaseGroup.add(lily1);

    const lily2 = createLilyOfTheValley(0xFFFACD); // Lemon Chiffon
    lily2.scale.set(0.6, 0.6, 0.6);
    lily2.position.set(-0.05, 0.15, 0.05);
    lily2.rotation.y = Math.random() * Math.PI;
    vaseGroup.add(lily2);

    const lily3 = createLilyOfTheValley(); // Default white
    lily3.scale.set(0.5, 0.5, 0.5);
    lily3.position.set(0, 0.1, -0.05);
    lily3.rotation.y = Math.random() * Math.PI;
    vaseGroup.add(lily3);
    
    return vaseGroup;
}

function createVasesWithFlowers() {
    const vasePositions = [ 
        { x: -1.5, y: 0.87, z: 1.5, s: 0.8 },
        { x: 1.5, y: 0.87, z: 1.5, s: 0.8 },
        { x: 1.8, y: 0.83, z: -0.5, s: 0.7 },
        { x: -1.8, y: 0.83, z: -0.5, s: 0.7 },
        { x: 0, y: 0.91, z: -2.2, s: 0.9 }
    ];
    for (const pos of vasePositions) {
        const vaseOfFlowers = createVaseWithFlowers();
        vaseOfFlowers.position.set(pos.x, pos.y, pos.z);
        vaseOfFlowers.scale.set(pos.s, pos.s, pos.s);
        vaseOfFlowers.userData.baseY = pos.y;
        state.scene.add(vaseOfFlowers);
        state.flowers.push(vaseOfFlowers);
    }
}

function createBalloons() {
    const balloonColors = [0xff69b4, 0xffd700, 0x00ffff, 0x9400d3, 0xffa500, 0x00ff00];
    const balloonGeo = new THREE.SphereGeometry(0.3, 32, 32);

    for (let i = 0; i < 15; i++) {
        const balloonMat = new THREE.MeshPhysicalMaterial({
            color: balloonColors[Math.floor(Math.random() * balloonColors.length)],
            metalness: 0.5,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8
        });
        const balloon = new THREE.Mesh(balloonGeo, balloonMat);

        const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.5, 8);
        const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const string = new THREE.Mesh(stringGeo, stringMat);
        string.position.y = -0.9;
        balloon.add(string);

        balloon.position.set(
            (Math.random() - 0.5) * 15,
            Math.random() * 2 + 2,
            (Math.random() - 0.5) * 10 - 5
        );
        balloon.userData.baseY = balloon.position.y;
        balloon.userData.speed = Math.random() * 0.2 + 0.1;
        balloon.userData.phase = Math.random() * Math.PI * 2;

        state.scene.add(balloon);
        state.balloons.push(balloon);
    }
}

function createSparkles() {
    const sparkleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(config.particles.sparkleCount * 3);
    for (let i = 0; i < config.particles.sparkleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const sparkleMat = new THREE.PointsMaterial({ size: 0.02, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    state.sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    state.scene.add(state.sparkles);
}

function setupPostProcessing() {
    state.composer = new EffectComposer(state.renderer);
    state.composer.addPass(new RenderPass(state.scene, state.camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), config.bloom.strength, config.bloom.radius, config.bloom.threshold);
    state.composer.addPass(bloomPass);

    const smaaPass = new SMAAPass( window.innerWidth * state.renderer.getPixelRatio(), window.innerHeight * state.renderer.getPixelRatio() );
    state.composer.addPass(smaaPass);

    const vignetteShader = {
        uniforms: {
            'tDiffuse': { value: null },
            'offset': { value: 1.0 },
            'darkness': { value: 1.0 }
        },
        vertexShader: [
            'varying vec2 vUv;',
            'void main() {',
            'vUv = uv;',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform sampler2D tDiffuse;',
            'uniform float offset;',
            'uniform float darkness;',
            'varying vec2 vUv;',
            'void main() {',
            'vec4 texel = texture2D( tDiffuse, vUv );',
            'vec2 uv = ( vUv - vec2( 0.5 ) ) * vec2( offset );',
            'gl_FragColor = vec4( mix( texel.rgb, vec3( 1.0 - darkness ), dot( uv, uv ) ), texel.a );',
            '}'
        ].join('\n')
    };

    const vignettePass = new ShaderPass(vignetteShader);
    state.composer.addPass(vignettePass);

    const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
    state.composer.addPass(gammaCorrectionPass);

    if (!config.isMobile) {
        const bokehPass = new BokehPass(state.scene, state.camera, { focus: config.bokeh.focus, aperture: config.bokeh.aperture, maxblur: config.bokeh.maxblur });
        state.composer.addPass(bokehPass);
    }
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('click', onClick);
}

function setupUI() {
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

function setupMicDetection() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            state.mic.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = state.mic.audioContext.createMediaStreamSource(stream);
            state.mic.analyser = state.mic.audioContext.createAnalyser();
            state.mic.analyser.fftSize = 32;
            state.mic.dataArray = new Uint8Array(state.mic.analyser.frequencyBinCount);
            source.connect(state.mic.analyser);
        }).catch(err => console.error("Microphone access denied:", err));
}

function updateMicLevel() {
    if (!state.mic.analyser) return;
    state.mic.analyser.getByteFrequencyData(state.mic.dataArray);
    const average = state.mic.dataArray.reduce((a, b) => a + b, 0) / state.mic.dataArray.length;
    if (average > config.micSensitivity) blowOutCandle();
}

function blowOutCandle() {
    if (!state.flame.visible) return;
    state.flame.visible = false;
    // if (state.audio.blowSound && state.audio.blowSound.buffer) state.audio.blowSound.play();
    clearTimeout(state.celebrationTimeout);
    gsap.to(state.candleLight, { intensity: 0, duration: 0.5 });
    createSmoke();
    state.celebrationTimeout = setTimeout(startCelebration, 500);
}

function startCelebration() {
    // if (state.audio.confettiSound && state.audio.confettiSound.buffer) state.audio.confettiSound.play();
    // if (state.audio.sparkleSound && state.audio.sparkleSound.buffer) state.audio.sparkleSound.play();
    createConfetti();
    for (const vaseGroup of state.flowers) {
        for (const item of vaseGroup.children) {
            if (item.type === 'Group') {
                for (const child of item.children) {
                    if (child.isMesh && child.material.color.getHexString() === 'ffffff') {
                        gsap.to(child.material.emissive, { r: 0.8, g: 0.8, b: 0.2, duration: 1.5, ease: "power2.out" });
                    }
                }
            }
        }
    }
    gsap.to(state.sparkles.material, { size: 0.04, duration: 1.5, ease: "power2.out" }).yoyo(true).repeat(1);

    const fontLoader = new FontLoader(state.loadingManager);
    fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', 
        font => {
            const textGeo = new TextGeometry('18', { font, size: 0.5, height: 0.1 });
            textGeo.center();
            const textMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, emissive: 0xFF007F, emissiveIntensity: 1, metalness: 0.8, roughness: 0.4 });
            const ageText = new THREE.Mesh(textGeo, textMat);
            ageText.position.set(0, 2.2, 0);
            ageText.scale.set(0.01, 0.01, 0.01);
            state.scene.add(ageText);
            gsap.to(ageText.scale, { x: 1, y: 1, z: 1, duration: 2, ease: "elastic.out(1, 0.5)" });
            gsap.to(ageText.rotation, { y: Math.PI * 2, duration: 3, ease: "power2.inOut" });
        },
        undefined,
        (error) => console.error('Font could not be loaded.', error)
    );

    gsap.to(state.camera.position, { z: 3.5, duration: 3, ease: "power2.inOut" });
    const finalMsgContainer = document.getElementById('final-message-container');
    const finalMsg = document.getElementById('final-message');
    const subMsg = document.getElementById('sub-message');
    finalMsg.textContent = "Happy 18th Birthday My Love ❤️";
    subMsg.textContent = "(How does it feel like to date a minor 🥰)";
    finalMsgContainer.style.display = 'block';
    gsap.to(finalMsg, { opacity: 1, y: 0, duration: 1.5, delay: 2 });
    gsap.to(subMsg, { opacity: 1, y: 0, duration: 1.5, delay: 2.5 });
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
    state.smokeParticles = createParticleSystem({
        count: 50,
        origin: { x: 0, y: 0.85, z: 0 },
        parent: state.cakeGroup,
        material: { size: 0.1, color: 0xaaaaaa, transparent: true, opacity: 0.5, blending: THREE.NormalBlending, depthWrite: false },
        setupVelocity: (arr, i3) => {
            arr[i3] = (Math.random() - 0.5) * 0.01;
            arr[i3 + 1] = Math.random() * 0.05 + 0.02;
            arr[i3 + 2] = (Math.random() - 0.5) * 0.01;
        }
    });
}

function createConfetti() {
    const colors = [new THREE.Color(0xFFD700), new THREE.Color(0xFF69B4), new THREE.Color(0x00FFFF), new THREE.Color(0x9400D3)];
    state.confettiParticles = createParticleSystem({
        count: config.particles.confettiCount,
        origin: { x: 0, y: 1.5, z: 0 },
        parent: state.scene,
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
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) { updateMouse(event.clientX, event.clientY); }
function onTouchStart(event) { if (event.touches.length > 0) updateMouse(event.touches[0].clientX, event.touches[0].clientY); }
function onClick() {
    state.raycaster.setFromCamera(state.mouse, state.camera);

    // Check for flame intersection
    if (state.raycaster.intersectObject(state.flame).length > 0) {
        blowOutCandle();
        return;
    }

    // Check for photo frame intersection
    const intersectsPhotos = state.raycaster.intersectObjects(state.photoFrames, true);
    if (intersectsPhotos.length > 0) {
        let object = intersectsPhotos[0].object;
        while (object.parent && !state.photoFrames.includes(object)) {
            object = object.parent;
        }
        if (state.photoFrames.includes(object)) {
            showPhotoModal(object.userData.photoTexture); // No message for photos
        }
        return;
    }
}

function showPhotoModal(texture, message = '') {
    const modal = document.getElementById('photo-modal');
    const enlargedPhoto = document.getElementById('enlarged-photo');
    const photoMessage = document.getElementById('photo-message');

    if (texture) {
        enlargedPhoto.src = texture.image.src;
        enlargedPhoto.style.display = 'block';
    } else {
        enlargedPhoto.style.display = 'none';
    }

    photoMessage.textContent = message;
    photoMessage.style.fontSize = texture ? '1.2em' : '2em';

    modal.style.display = 'flex';

    const closeModal = document.getElementById('close-modal');
    closeModal.onclick = () => {
        modal.style.display = 'none';
    };
}
function updateMouse(x, y) {
    state.mouse.x = (x / window.innerWidth) * 2 - 1;
    state.mouse.y = -(y / window.innerHeight) * 2 + 1;
}

function checkIntersection() {

    state.raycaster.setFromCamera(state.mouse, state.camera);

    const intersects = state.raycaster.intersectObjects(state.photoFrames, true);



    let intersectedGroup = null;

    if (intersects.length > 0) {

        let object = intersects[0].object;

        while (object.parent && !state.photoFrames.includes(object)) {

            object = object.parent;

        }

        if (state.photoFrames.includes(object)) {

            intersectedGroup = object;

        }

    }



    if (state.intersectedFrame !== intersectedGroup) {

        if (state.intersectedFrame) {

            // Animate out the old intersected frame

            gsap.to(state.intersectedFrame.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: "power2.out" });

            const border = state.intersectedFrame.children.find(c => c.geometry.type === 'BoxGeometry');

            if (border) {

                gsap.to(border.material.color, { r: 0.545, g: 0.27, b: 0.075, duration: 0.3 }); // 0x8B4513

            }

        }



        if (intersectedGroup) {

            // Animate in the new intersected frame

            gsap.to(intersectedGroup.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.3, ease: "power2.out" });

            const border = intersectedGroup.children.find(c => c.geometry.type === 'BoxGeometry');

            if (border) {

                gsap.to(border.material.color, { r: 1, g: 0.75, b: 0.8, duration: 0.3 }); // 0xffc0cb

            }

        }



        state.intersectedFrame = intersectedGroup;

    }

}



function animate() {

    requestAnimationFrame(animate);

    const delta = state.clock.getDelta();

    const elapsedTime = state.clock.getElapsedTime();



    if (state.cakeGroup) state.cakeGroup.position.y = config.cakeBaseY + Math.sin(elapsedTime * 0.5) * 0.05;



    for (const [i, f] of state.flowers.entries()) {

        f.position.y = f.userData.baseY + Math.sin(elapsedTime * 0.4 + i) * 0.05;

        f.rotation.y += Math.sin(elapsedTime * 0.3 + i) * 0.002;

    }

    for (const balloon of state.balloons) {
        balloon.rotation.y += 0.001; // Slow rotation
        const scale = 1 + Math.sin(elapsedTime * balloon.userData.speed + balloon.userData.phase) * 0.05;
        balloon.scale.set(scale, scale, scale);
    }

    if (state.flame && state.flame.visible) {

        const flicker = Math.random() * 0.08;

        state.flame.scale.y = 1 + Math.sin(elapsedTime * 30) * 0.2 + flicker;

        state.flame.scale.x = 1 + Math.sin(elapsedTime * 20) * 0.1 + flicker;

        state.flame.position.x = Math.sin(elapsedTime * 5) * 0.005;

        if (state.candleLight) state.candleLight.intensity = config.lightIntensity.base * (1 - flicker * 8);

    }

    if (state.smokeParticles) {

        const pos = state.smokeParticles.geometry.attributes.position;

        const vel = state.smokeParticles.geometry.attributes.velocity;

        for (let i = 0; i < pos.count; i++) {

            const i3 = i * 3;

            pos.array[i3] += vel.array[i3];

            pos.array[i3 + 1] += vel.array[i3 + 1];

            pos.array[i3 + 2] += vel.array[i3 + 2];

        }

        pos.needsUpdate = true;

        state.smokeParticles.material.opacity -= 0.005;

        if (state.smokeParticles.material.opacity <= 0) {

            state.cakeGroup.remove(state.smokeParticles);

            state.smokeParticles = null;

        }

    }

    if (state.confettiParticles) {

        const pos = state.confettiParticles.geometry.attributes.position;

        const vel = state.confettiParticles.geometry.attributes.velocity;

        for (let i = 0; i < pos.count; i++) {

            vel.array[i * 3 + 1] -= 0.001; // Gravity

            pos.array[i * 3] += vel.array[i * 3];

            pos.array[i * 3 + 1] += vel.array[i * 3 + 1];

            pos.array[i * 3 + 2] += vel.array[i * 3 + 2];

        }

        pos.needsUpdate = true;

        state.confettiParticles.material.opacity -= 0.002;

        if (state.confettiParticles.material.opacity <= 0) {

            state.scene.remove(state.confettiParticles);

            state.confettiParticles = null;

        }

    }

    if (state.sparkles) {

        state.sparkles.rotation.y = elapsedTime * 0.1;

        const pos = state.sparkles.geometry.attributes.position;

        for (let i = 0; i < pos.count; i++) {

            pos.array[i * 3 + 1] += Math.sin(elapsedTime + i) * 0.001;

        }

        pos.needsUpdate = true;

    }



    updateMicLevel();

    checkIntersection();

    state.controls.update(delta);

    state.composer.render();

}
