var scene, camera, renderer, clock, mixer, controls, params, lights;
var actions = [];
var loadedModel;
var currentPath = '';
var isWireframe = false;
var isRotating = false;
var rotationSpeed = Math.PI * 0.35;
var sound, listener, audioLoader;

// Model-specific configurations
var modelConfigs = {
    'assets/models/milktea.glb': {
        camera: { x: -3, y: 4, z: -7.9},
        sound: 'assets/audio/milktea.mp3',
        lights: {
            ambient: { intensity: 3, color: 0xd2ffee },
            direct: { intensity: 4.25, color: 0xffffff, x: 3, y: 5, z: 2 },
            hemisphere: { intensity: 1.1, skyColor: 0xffffff, groundColor: 0xdedede },
            under: { intensity: 20, color: 0xffffff, x: 0, y: -2.2, z: 0 }
        }
    },
    'assets/models/eggtart.glb': {
        camera: { x: -3, y: 2.5, z: 2 },
        sound: 'assets/audio/eggtart_1.mp3',
        lights: {
            ambient: { intensity: 3, color: 0xd2ffee },
            direct: { intensity: 4.25, color: 0xffffff, x: 3, y: 5, z: 2 },
            hemisphere: { intensity: 1.1, skyColor: 0xffffff, groundColor: 0xdedede },
            under: { intensity: 20, color: 0xffffff, x: 0, y: -2.2, z: 0 }
        }
    },
    'assets/models/eggtart_metal.glb': {
        camera: { x: -3, y: 2.5, z: 2 },
        sound: 'assets/audio/eggtart_2.mp3',
        lights: {
            ambient: { intensity: 3, color: 0xd2ffee },
            direct: { intensity: 4.25, color: 0xffffff, x: 3, y: 5, z: 2 },
            hemisphere: { intensity: 1.1, skyColor: 0xffffff, groundColor: 0xdedede },
            under: { intensity: 20, color: 0xffffff, x: 0, y: -2.2, z: 0 }
        }
    },
    'assets/models/eggwaffle1.glb': {
        camera: { x: -3, y: 2.5, z: 2 },
        sound: 'assets/audio/eggwaffle.mp3',
        lights: {
            ambient: { intensity: 3, color: 0xd2ffee },
            direct: { intensity: 4.25, color: 0xffffff, x: 3, y: 5, z: 2 },
            hemisphere: { intensity: 1.1, skyColor: 0xffffff, groundColor: 0xdedede },
            under: { intensity: 20, color: 0xffffff, x: 0, y: -2.2, z: 0 }
        }
    },
    'assets/models/eggwaffle.glb': {
    camera: { x: -5, y: 2, z: 2 },
    sound: 'assets/audio/eggwaffle.mp3',
    lights: {
        ambient: { intensity: 3, color: 0xd2ffee },
        direct: { intensity: 4.25, color: 0xffffff, x: 3, y: 5, z: 2 },
        hemisphere: { intensity: 1.1, skyColor: 0xffffff, groundColor: 0xdedede },
        under: { intensity: 20, color: 0xffffff, x: 0, y: -2.2, z: 0 }
    }
}
};

// Store original camera positions for zoom functionality
var originalCameraPosition = {};
var originalCameraDistance = 0;

// Set to true to enable the dat.GUI panel
var ENABLE_GUI = false;

window.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('threeContainer')) {
        return;
    }
    init();
});

function init() {
    const bodyData = document.body.dataset;
    const primaryModel = bodyData.modelPrimary || 'assets/models/eggtart.glb';
    const secondaryModel = bodyData.modelSecondary || '';

    clock = new THREE.Clock();
    scene = new THREE.Scene();
    // scene.background = new THREE.Color(0xFBFADA);
    // scene.fog = null;

    const bgTexture = new THREE.TextureLoader().load('assets/images/modelBG.webp');
    bgTexture.colorSpace = THREE.SRGBColorSpace; // use renderer.outputEncoding = sRGBEncoding already in your code
    scene.background = bgTexture;

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-3, 2.5, 2);

    listener = new THREE.AudioListener();
    camera.add(listener);

    sound = new THREE.Audio(listener);

    audioLoader = new THREE.AudioLoader();

    lights = {};
    lights.ambient = new THREE.AmbientLight(0xd2ffee, 3);
    scene.add(lights.ambient);

    lights.hemisphere = new THREE.HemisphereLight(0xffffff, 0xdedede, 1.1);
    lights.hemisphere.visible = true;
    scene.add(lights.hemisphere);

    lights.direct = new THREE.DirectionalLight(0xffffff, 4.25);
    lights.direct.position.set(3, 5, 2);
    scene.add(lights.direct);

    lights.under = new THREE.PointLight(0xffffff, 20, 0, 2);
    lights.under.position.set(0, -2.2, 0);
    scene.add(lights.under);

    params = {
        renderer: {
            exposure: -0.6,
            toneMappingMode: 'linear',
            punctualLights: true,
            background: 0xFBFADA
        },
        camera: {
            posX: -3,
            posY: 2.5,
            posZ: 2
        },
        ambient: {
            intensity: 3,
            color: 0xd2ffee
        },
        direct: {
            intensity: 4,
            color: 0xffffff,
            posX: 3,
            posY: 5,
            posZ: 2
        },
        hemisphere: {
            intensity: 1.1,
            skyColor: 0xffffff,
            groundColor: 0xdedede
        },
        under: {
            intensity: 20,
            color: 0xffffff,
            posX: 0,
            posY: -2.2,
            posZ: 0
        }
    };

    const guiContainer = document.getElementById('gui-container');
    if (ENABLE_GUI && guiContainer && typeof dat !== 'undefined') {
        const gui = new dat.GUI({ autoPlace: false });
        guiContainer.appendChild(gui.domElement);
        const renderer_folder = gui.addFolder('Renderer');
        renderer_folder.add(params.renderer, 'exposure', -2, 2, 0.1).onChange(function (value) { renderer.toneMappingExposure = Math.pow(2, value); });
        renderer_folder.add(params.renderer, 'toneMappingMode', ['linear', 'reinhard', 'cineon', 'acesfilm']).onChange(function (value) {
            const modes = { linear: THREE.LinearToneMapping, reinhard: THREE.ReinhardToneMapping, cineon: THREE.CineonToneMapping, acesfilm: THREE.ACESFilmicToneMapping };
            renderer.toneMapping = modes[value] || THREE.LinearToneMapping;
        });
        renderer_folder.add(params.renderer, 'punctualLights').onChange(function (value) { renderer.physicallyCorrectLights = value; });
        renderer_folder.addColor(params.renderer, 'background').onChange(function (value) { scene.background = new THREE.Color(value); });
        
        const camera_folder = gui.addFolder('Camera');
        camera_folder.add(params.camera, 'posX', -20, 20, 0.1).onChange(function (value) { camera.position.x = value; });
        camera_folder.add(params.camera, 'posY', -20, 20, 0.1).onChange(function (value) { camera.position.y = value; });
        camera_folder.add(params.camera, 'posZ', -20, 20, 0.1).onChange(function (value) { camera.position.z = value; });
        
        const ambient_folder = gui.addFolder('Ambient');
        ambient_folder.add(params.ambient, 'intensity', 0, 2, 0.05).onChange(function (value) { lights.ambient.intensity = value; });
        ambient_folder.addColor(params.ambient, 'color').onChange(function (value) { lights.ambient.color = new THREE.Color(value); });
        const direct_folder = gui.addFolder('Direct Light');
        direct_folder.add(params.direct, 'intensity', 0, 5, 0.05).onChange(function (value) { lights.direct.intensity = value; });
        direct_folder.addColor(params.direct, 'color').onChange(function (value) { lights.direct.color = new THREE.Color(value); });
        direct_folder.add(params.direct, 'posX', -20, 20, 0.5).onChange(function (value) { lights.direct.position.x = value; });
        direct_folder.add(params.direct, 'posY', -20, 20, 0.5).onChange(function (value) { lights.direct.position.y = value; });
        direct_folder.add(params.direct, 'posZ', -20, 20, 0.5).onChange(function (value) { lights.direct.position.z = value; });
        const hemisphere_folder = gui.addFolder('Hemisphere');
        hemisphere_folder.add(params.hemisphere, 'intensity', 0, 2, 0.05).onChange(function (value) { lights.hemisphere.intensity = value; });
        hemisphere_folder.addColor(params.hemisphere, 'skyColor').onChange(function (value) { lights.hemisphere.color = new THREE.Color(value); });
        hemisphere_folder.addColor(params.hemisphere, 'groundColor').onChange(function (value) { lights.hemisphere.groundColor = new THREE.Color(value); });
        const under_folder = gui.addFolder('Under Light');
        under_folder.add(params.under, 'intensity', 0, 80, 0.5).onChange(function (value) { lights.under.intensity = value; });
        under_folder.addColor(params.under, 'color').onChange(function (value) { lights.under.color = new THREE.Color(value); });
        under_folder.add(params.under, 'posX', -10, 10, 0.1).onChange(function (value) { lights.under.position.x = value; });
        under_folder.add(params.under, 'posY', -10, 10, 0.1).onChange(function (value) { lights.under.position.y = value; });
        under_folder.add(params.under, 'posZ', -10, 10, 0.1).onChange(function (value) { lights.under.position.z = value; });
    }

    const canvas = document.getElementById('threeContainer');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = Math.pow(2, -0.6);
    renderer.physicallyCorrectLights = true;
    renderer.setPixelRatio(window.devicePixelRatio);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.update();

    const loader = new THREE.GLTFLoader();

    function getModelConfig(modelPath) {
        // Check if there's a specific config for this model
        for (const key in modelConfigs) {
            if (modelPath.includes(key)) {
                return modelConfigs[key];
            }
        }
        // Return default config if no match found
        return {
            camera: { x: -3, y: 2.5, z: 2 },
            sound: 'assets/audio/eggtart_1.mp3',
            lights: {
                ambient: { intensity: 3, color: 0xd2ffee },
                direct: { intensity: 4.25, color: 0xffffff, x: 3, y: 5, z: 2 },
                hemisphere: { intensity: 1.1, skyColor: 0xffffff, groundColor: 0xdedede },
                under: { intensity: 20, color: 0xffffff, x: 0, y: -2.2, z: 0 }
            }
        };
    }

    function loadSoundsForModel(modelPath) {
        const config = getModelConfig(modelPath);
        
        if (config.sound) {
            audioLoader.load(config.sound, function (buffer) {
                sound.setBuffer(buffer);
                sound.setLoop(false);
                sound.setVolume(0.5);
            });
        }
    }

    //#region Apply settings (camera and lighting)
    function applyModelSettings(modelPath) {
        const config = getModelConfig(modelPath);

        // Load sounds for this model
        loadSoundsForModel(modelPath);

        // Apply camera position
        camera.position.set(config.camera.x, config.camera.y, config.camera.z);
        camera.updateProjectionMatrix();

        // Update orbit controls target
        controls.target.set(0, 0.5, 0);
        controls.update();

        // Update original camera position/distance for zoom functionality
        originalCameraPosition = { x: config.camera.x, y: config.camera.y, z: config.camera.z };
        originalCameraDistance = camera.position.distanceTo(controls.target);

        // Update orbit controls target
        controls.target.set(0, 0.5, 0);
        controls.update();
        
        // Update camera params in GUI
        if (params && params.camera) {
            params.camera.posX = config.camera.x;
            params.camera.posY = config.camera.y;
            params.camera.posZ = config.camera.z;
        }
        
        // Apply lighting settings
        lights.ambient.intensity = config.lights.ambient.intensity;
        lights.ambient.color = new THREE.Color(config.lights.ambient.color);
        
        lights.direct.intensity = config.lights.direct.intensity;
        lights.direct.color = new THREE.Color(config.lights.direct.color);
        lights.direct.position.set(config.lights.direct.x, config.lights.direct.y, config.lights.direct.z);
        
        lights.hemisphere.intensity = config.lights.hemisphere.intensity;
        lights.hemisphere.color = new THREE.Color(config.lights.hemisphere.skyColor);
        lights.hemisphere.groundColor = new THREE.Color(config.lights.hemisphere.groundColor);
        
        lights.under.intensity = config.lights.under.intensity;
        lights.under.color = new THREE.Color(config.lights.under.color);
        lights.under.position.set(config.lights.under.x, config.lights.under.y, config.lights.under.z);
        
        // Update GUI if available
        if (typeof dat !== 'undefined' && params) {
            params.ambient.intensity = config.lights.ambient.intensity;
            params.ambient.color = config.lights.ambient.color;
            params.direct.intensity = config.lights.direct.intensity;
            params.direct.color = config.lights.direct.color;
            params.direct.posX = config.lights.direct.x;
            params.direct.posY = config.lights.direct.y;
            params.direct.posZ = config.lights.direct.z;
            params.hemisphere.intensity = config.lights.hemisphere.intensity;
            params.hemisphere.skyColor = config.lights.hemisphere.skyColor;
            params.hemisphere.groundColor = config.lights.hemisphere.groundColor;
            params.under.intensity = config.lights.under.intensity;
            params.under.color = config.lights.under.color;
            params.under.posX = config.lights.under.x;
            params.under.posY = config.lights.under.y;
            params.under.posZ = config.lights.under.z;
        }
    }

    function loadModel(modelPath) {
        if (!modelPath) {
            return;
        }

        if (loadedModel) {
            scene.remove(loadedModel);
        }

        loader.load(modelPath, function (gltf) {
            loadedModel = gltf.scene;
            loadedModel.position.set(0, 0, 0);
            scene.add(loadedModel);
            currentPath = modelPath;

            // Apply model-specific settings
            applyModelSettings(modelPath);

            mixer = new THREE.AnimationMixer(loadedModel);
            actions = [];
            gltf.animations.forEach(function (clip) {
                actions.push(mixer.clipAction(clip));
            });
        });
    }

    loadModel(primaryModel);

    // Apply initial model settings immediately (camera and lighting)
    const initialConfig = getModelConfig(primaryModel);
    camera.position.set(initialConfig.camera.x, initialConfig.camera.y, initialConfig.camera.z);
    camera.updateProjectionMatrix();
    
    // Store original camera position for zoom functionality
    originalCameraPosition = { x: initialConfig.camera.x, y: initialConfig.camera.y, z: initialConfig.camera.z };
    originalCameraDistance = camera.position.distanceTo(controls.target);
    
    // Update initial params
    params.camera.posX = initialConfig.camera.x;
    params.camera.posY = initialConfig.camera.y;
    params.camera.posZ = initialConfig.camera.z;

    //#region buttons
    const playBtn = document.getElementById('btn');
    if (playBtn) {
        playBtn.addEventListener('click', function () {
            if (!actions.length) {
                return;
            }
            actions.forEach(function (action) {
                action.reset();
                action.clampWhenFinished = true;
                action.loop = THREE.LoopOnce;
                action.play();
            });
            // Play sound
            if (sound && sound.isPlaying) {
                sound.stop();
            }
            if (sound && sound.buffer) {
                sound.play();
            }
        });
    }

    const wireframeBtn = document.getElementById('toggleWireframe');
    if (wireframeBtn) {
        wireframeBtn.addEventListener('click', function () {
            isWireframe = !isWireframe;
            toggleWireframe(isWireframe);
        });
    }

    const rotateBtn = document.getElementById('rotate');
    if (rotateBtn) {
        rotateBtn.textContent = 'Rotate';
        rotateBtn.addEventListener('click', function () {
            if (!loadedModel) {
                return;
            }
            isRotating = !isRotating;
            rotateBtn.textContent = isRotating ? 'Stop' : 'Rotate';
        });
    }

    const zoomInBtn = document.getElementById('zoomIn');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function () {
            // Zoom in by moving camera closer to OrbitControls target
            const target = controls ? controls.target.clone() : new THREE.Vector3(0, 0.5, 0);
            const currentPos = camera.position.clone();

            const currentDistance = currentPos.distanceTo(target);
            const nextDistance = Math.max(currentDistance * 0.6, 0.35); // keep a safe minimum

            const newPos = target.clone().add(currentPos.clone().sub(target).normalize().multiplyScalar(nextDistance));
            animateCamera(currentPos, newPos, 800);
        });
    }

    const zoomOutBtn = document.getElementById('zoomOut');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function () {
            // Zoom out back to the model's original camera distance/position
            const target = controls ? controls.target.clone() : new THREE.Vector3(0, 0.5, 0);
            const endPos = (originalCameraDistance > 0)
                ? target.clone().add(camera.position.clone().sub(target).normalize().multiplyScalar(originalCameraDistance))
                : new THREE.Vector3(originalCameraPosition.x, originalCameraPosition.y, originalCameraPosition.z);

            animateCamera(camera.position, endPos, 800);
        });
    }

    const switchModelBtn = document.getElementById('switchModel');
    if (switchModelBtn) {
        switchModelBtn.addEventListener('click', function () {
            if (!secondaryModel) {
                return;
            }
            loadModel(currentPath === primaryModel ? secondaryModel : primaryModel);
        });
        //#endregion
    }

    window.addEventListener('resize', resize, false);
    resize();
    animate();
}

function toggleWireframe(enable) {
    scene.traverse(function (child) {
        if (child.isMesh && child.material) {
            child.material.wireframe = enable;
        }
    });
}

// Camera animation helper
function animateCamera(startPos, endPos, duration) {
    if (!camera) {
        return;
    }

    // Normalize inputs (support THREE.Vector3 or plain {x,y,z})
    const startVec = (startPos && startPos.isVector3)
        ? startPos.clone()
        : new THREE.Vector3(startPos?.x ?? camera.position.x, startPos?.y ?? camera.position.y, startPos?.z ?? camera.position.z);

    const endVec = (endPos && endPos.isVector3)
        ? endPos.clone()
        : new THREE.Vector3(endPos?.x ?? camera.position.x, endPos?.y ?? camera.position.y, endPos?.z ?? camera.position.z);

    const startTime = performance.now();

    function updateCamera(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-in-out cubic)
        const easeProgress = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        camera.position.lerpVectors(startVec, endVec, easeProgress);

        // Keep OrbitControls in sync
        if (controls) {
            controls.update();
        }

        // Update params for GUI
        if (params && params.camera) {
            params.camera.posX = camera.position.x;
            params.camera.posY = camera.position.y;
            params.camera.posZ = camera.position.z;
        }

        if (progress < 1) {
            requestAnimationFrame(updateCamera);
        }
    }

    requestAnimationFrame(updateCamera);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock ? clock.getDelta() : 0;

    if (isRotating && loadedModel) {
        loadedModel.rotation.y += rotationSpeed * delta;
    }

    if (mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
}

function resize() {
    if (!renderer || !camera) {
        return;
    }

    const canvas = document.getElementById('threeContainer');
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}



