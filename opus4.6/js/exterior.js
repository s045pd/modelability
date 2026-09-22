import * as THREE from 'three';
import { materials, createWindowTexture } from './materials.js';

/**
 * Creates the complete exterior geometry for the USS Enterprise NCC-1701-D.
 * All geometry is generated procedurally.
 *
 * SCALE: Ship total length = 64 units along Z axis.
 * - Saucer center at approx (0, 8, 14)
 * - Saucer diameter ≈ 46 units, thickness ≈ 4.5 units
 * - Engineering hull center at approx (0, 0, -8)
 * - Engineering hull length ≈ 30 units, width ≈ 11, height ≈ 14
 * - Nacelles at approx (±11, 12, -12), length ≈ 40 units, diameter ≈ 4
 *
 * @returns {Object} { group, refs }
 */
export function createExterior() {
    const group = new THREE.Group();
    group.name = 'Enterprise-D_Exterior';

    const refs = {
        navLights: [],
        phaserStrips: []
    };

    // Main hierarchical sections
    const saucerGroup = new THREE.Group();
    saucerGroup.name = 'Saucer_Section';
    
    const engineeringGroup = new THREE.Group();
    engineeringGroup.name = 'Engineering_Section';

    refs.saucerGroup = saucerGroup;
    refs.engineeringGroup = engineeringGroup;

    group.add(saucerGroup);
    group.add(engineeringGroup);

    // ==========================================
    // 1. SAUCER SECTION (碟部)
    // ==========================================
    // Position saucer center globally
    saucerGroup.position.set(0, 8, 14);

    const saucerRadius = 23;
    const saucerThickness = 4.5;

    // --- Main Disc ---
    const saucerPoints = [];
    // Top profile (center to edge)
    saucerPoints.push(new THREE.Vector2(0, saucerThickness * 0.5));
    saucerPoints.push(new THREE.Vector2(saucerRadius * 0.2, saucerThickness * 0.45));
    saucerPoints.push(new THREE.Vector2(saucerRadius * 0.5, saucerThickness * 0.25));
    saucerPoints.push(new THREE.Vector2(saucerRadius * 0.85, saucerThickness * 0.1));
    saucerPoints.push(new THREE.Vector2(saucerRadius, 0));
    // Bottom profile (edge to center)
    saucerPoints.push(new THREE.Vector2(saucerRadius * 0.85, -saucerThickness * 0.1));
    saucerPoints.push(new THREE.Vector2(saucerRadius * 0.5, -saucerThickness * 0.3));
    saucerPoints.push(new THREE.Vector2(saucerRadius * 0.2, -saucerThickness * 0.45));
    saucerPoints.push(new THREE.Vector2(0, -saucerThickness * 0.5));

    const saucerGeo = new THREE.LatheGeometry(saucerPoints, 128);
    // Improve normals for smoothness
    saucerGeo.computeVertexNormals();
    const saucerMesh = new THREE.Mesh(saucerGeo, materials.hull);
    saucerMesh.name = 'Saucer_Hull';
    saucerGroup.add(saucerMesh);

    // --- Bridge Dome ---
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.y = saucerThickness * 0.5;
    
    const bridgeDomeGeo = new THREE.SphereGeometry(1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const bridgeDomeMesh = new THREE.Mesh(bridgeDomeGeo, materials.bridgeDome);
    bridgeGroup.add(bridgeDomeMesh);

    const bridgeBaseGeo = new THREE.CylinderGeometry(2.5, 3.5, 0.6, 64);
    const bridgeBaseMesh = new THREE.Mesh(bridgeBaseGeo, materials.hull);
    bridgeBaseMesh.position.y = -0.3;
    bridgeGroup.add(bridgeBaseMesh);
    
    saucerGroup.add(bridgeGroup);

    // --- Battle Bridge Bump (Bottom Center) ---
    const battleBridgeGeo = new THREE.SphereGeometry(1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const battleBridgeMesh = new THREE.Mesh(battleBridgeGeo, materials.hullDark);
    battleBridgeMesh.rotation.x = Math.PI;
    battleBridgeMesh.position.y = -saucerThickness * 0.5 + 0.1;
    saucerGroup.add(battleBridgeMesh);

    // --- Phaser Arrays (Top and Bottom) ---
    const phaserRadius = saucerRadius * 0.75;
    const phaserGeo = new THREE.TorusGeometry(phaserRadius, 0.15, 8, 128);
    
    const phaserTop = new THREE.Mesh(phaserGeo, materials.phaser);
    phaserTop.rotation.x = Math.PI / 2;
    phaserTop.position.y = saucerThickness * 0.15;
    // Flatten it slightly to form a strip rather than a tube
    phaserTop.scale.set(1, 1, 0.5);
    saucerGroup.add(phaserTop);
    
    const phaserBottom = new THREE.Mesh(phaserGeo, materials.phaser);
    phaserBottom.rotation.x = Math.PI / 2;
    phaserBottom.position.y = -saucerThickness * 0.15;
    phaserBottom.scale.set(1, 1, 0.5);
    saucerGroup.add(phaserBottom);
    
    refs.phaserStrips.push(phaserTop, phaserBottom);

    // --- Sensor Strip (Edge Band) ---
    const sensorStripGeo = new THREE.TorusGeometry(saucerRadius + 0.05, 0.1, 8, 128);
    const sensorStripMesh = new THREE.Mesh(sensorStripGeo, materials.hullDark);
    sensorStripMesh.rotation.x = Math.PI / 2;
    saucerGroup.add(sensorStripMesh);

    // --- Impulse Engines ---
    const impulseGroup = new THREE.Group();
    // Placed at the rear of the saucer
    impulseGroup.position.set(0, saucerThickness * 0.1, -saucerRadius + 1.5);
    
    const impulseHousingGeo = new THREE.BoxGeometry(6, 1.2, 2);
    const impulseHousing = new THREE.Mesh(impulseHousingGeo, materials.hullDark);
    impulseGroup.add(impulseHousing);

    const impulseGlowGeo = new THREE.BoxGeometry(5.5, 0.8, 2.1);
    const impulseGlow = new THREE.Mesh(impulseGlowGeo, materials.impulseGlow);
    impulseGroup.add(impulseGlow);
    
    saucerGroup.add(impulseGroup);
    refs.impulseEngines = impulseGlow;

    // --- Windows (InstancedMesh) ---
    const windowGeo = new THREE.PlaneGeometry(0.4, 0.2);
    const windowCount = 300;
    const windowInstanced = new THREE.InstancedMesh(windowGeo, materials.window, windowCount);
    const dummy = new THREE.Object3D();
    
    let windowIdx = 0;
    // Top rim windows
    for (let i = 0; i < 150; i++) {
        const angle = (i / 150) * Math.PI * 2;
        // Avoid impulse engine area at the rear (angle approx -PI/2)
        if (Math.abs(angle - 1.5 * Math.PI) < 0.2) continue;
        
        const r = saucerRadius - 0.5;
        dummy.position.set(Math.cos(angle) * r, 0.2, Math.sin(angle) * r);
        dummy.rotation.y = -angle + Math.PI / 2;
        // Slight tilt matching hull
        dummy.rotation.x = -0.1;
        dummy.updateMatrix();
        windowInstanced.setMatrixAt(windowIdx++, dummy.matrix);
    }
    // Bottom rim windows
    for (let i = 0; i < 150; i++) {
        const angle = (i / 150) * Math.PI * 2;
        const r = saucerRadius - 0.8;
        dummy.position.set(Math.cos(angle) * r, -0.3, Math.sin(angle) * r);
        dummy.rotation.y = -angle + Math.PI / 2;
        dummy.rotation.x = 0.1;
        dummy.updateMatrix();
        windowInstanced.setMatrixAt(windowIdx++, dummy.matrix);
    }
    windowInstanced.count = windowIdx;
    saucerGroup.add(windowInstanced);

    // --- Escape Pod / Lifeboat Hatches (InstancedMesh) ---
    const podGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const podCount = 200;
    const podInstanced = new THREE.InstancedMesh(podGeo, materials.hullDark, podCount);
    
    let podIdx = 0;
    for (let i = 0; i < 100; i++) {
        // Top hatches
        const angle = (i / 100) * Math.PI * 2;
        const r = saucerRadius * 0.6 + (Math.random() * 2 - 1);
        dummy.position.set(Math.cos(angle) * r, saucerThickness * 0.2 + 0.05, Math.sin(angle) * r);
        dummy.rotation.x = -Math.PI / 2;
        dummy.rotation.z = angle;
        dummy.updateMatrix();
        podInstanced.setMatrixAt(podIdx++, dummy.matrix);
    }
    for (let i = 0; i < 100; i++) {
        // Bottom hatches
        const angle = (i / 100) * Math.PI * 2;
        const r = saucerRadius * 0.5 + (Math.random() * 2 - 1);
        dummy.position.set(Math.cos(angle) * r, -saucerThickness * 0.3 - 0.05, Math.sin(angle) * r);
        dummy.rotation.x = Math.PI / 2;
        dummy.rotation.z = -angle;
        dummy.updateMatrix();
        podInstanced.setMatrixAt(podIdx++, dummy.matrix);
    }
    saucerGroup.add(podInstanced);

    // --- RCS Thrusters ---
    const rcsGeo = new THREE.BoxGeometry(1, 0.4, 0.4);
    const rcsPositions = [
        { x: saucerRadius, y: 0, z: 0, rotY: 0 },
        { x: -saucerRadius, y: 0, z: 0, rotY: 0 },
        { x: 0, y: 0, z: saucerRadius, rotY: Math.PI / 2 },
    ];
    rcsPositions.forEach(pos => {
        const rcsMesh = new THREE.Mesh(rcsGeo, materials.hullDark);
        rcsMesh.position.set(pos.x, pos.y, pos.z);
        rcsMesh.rotation.y = pos.rotY;
        saucerGroup.add(rcsMesh);
    });

    // --- Nav Lights (Saucer) ---
    const navGeo = new THREE.SphereGeometry(0.3, 16, 16);
    
    const navRed = new THREE.Mesh(navGeo, materials.navRed);
    navRed.position.set(-saucerRadius - 0.2, 0, 0);
    saucerGroup.add(navRed);
    
    const navGreen = new THREE.Mesh(navGeo, materials.navGreen);
    navGreen.position.set(saucerRadius + 0.2, 0, 0);
    saucerGroup.add(navGreen);
    
    const navWhite1 = new THREE.Mesh(navGeo, materials.navWhite);
    navWhite1.position.set(0, saucerThickness * 0.5 + 1.0, -saucerRadius * 0.8);
    saucerGroup.add(navWhite1);

    const navWhite2 = new THREE.Mesh(navGeo, materials.navWhite);
    navWhite2.position.set(0, -saucerThickness * 0.5 - 1.0, -saucerRadius * 0.8);
    saucerGroup.add(navWhite2);
    
    refs.navLights.push(navRed, navGreen, navWhite1, navWhite2);

    // --- Ship Name Texture & Label ---
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext('2d');
    
    // Fill with a color that matches the hull closely to blend in, 
    // but we will use transparency for the background instead.
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    
    ctx.font = 'Bold 80px "Arial Black", sans-serif';
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('USS ENTERPRISE', 512, 80);
    ctx.font = 'Bold 60px "Arial Black", sans-serif';
    ctx.fillText('NCC-1701-D', 512, 170);
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.anisotropy = 16; // Improve texture quality at grazing angles
    
    const textMat = new THREE.MeshStandardMaterial({ 
        map: textTexture, 
        transparent: true,
        opacity: 0.9,
        roughness: 0.8,
        metalness: 0.2,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
    
    const namePlaneGeo = new THREE.PlaneGeometry(16, 4);
    
    const nameTop = new THREE.Mesh(namePlaneGeo, textMat);
    nameTop.rotation.x = -Math.PI / 2;
    // Slightly elevated to prevent z-fighting
    nameTop.position.set(0, saucerThickness * 0.2 + 0.1, 7); 
    saucerGroup.add(nameTop);
    
    const nameBottom = new THREE.Mesh(namePlaneGeo, textMat);
    nameBottom.rotation.x = Math.PI / 2;
    // Rotate to be readable from below, front-facing
    nameBottom.rotation.z = Math.PI; 
    nameBottom.position.set(0, -saucerThickness * 0.2 - 0.1, 7);
    saucerGroup.add(nameBottom);
    
    refs.shipNameLabel = nameTop;

    // ==========================================
    // 2. ENGINEERING HULL / STARDRIVE SECTION
    // ==========================================
    // Position engineering hull center globally
    engineeringGroup.position.set(0, 0, -8);
    
    const engLength = 30;
    const engWidth = 11;
    const engHeight = 14;
    
    // --- Main Body (Lathe converted to oval) ---
    const engPoints = [];
    const segments = 64;
    for(let i = 0; i <= segments; i++) {
        const t = i / segments;
        // Map t from 0 (rear) to 1 (front)
        const z = -engLength/2 + t * engLength; 
        
        // Shape profile: wider at rear/middle, tapering to a narrower nose at front
        let r;
        if (t > 0.8) {
            // Front nose cone curve
            const noseT = (t - 0.8) / 0.2; // 0 to 1
            r = Math.cos(noseT * Math.PI / 2) * (engWidth / 2);
        } else {
            // Main body curve
            // t goes 0 to 0.8
            // We want it thickest around t=0.3
            const bodyT = t / 0.8;
            r = (engWidth / 2) * (0.6 + 0.4 * Math.sin(bodyT * Math.PI));
        }
        
        // Ensure strictly positive radius
        r = Math.max(r, 0.01);
        engPoints.push(new THREE.Vector2(r, z));
    }
    
    const engGeo = new THREE.LatheGeometry(engPoints, 64);
    engGeo.rotateX(Math.PI / 2);
    // Scale vertically to create the distinct tall/narrow oval cross-section
    engGeo.scale(1, engHeight / engWidth, 1);
    engGeo.computeVertexNormals();
    
    const engMesh = new THREE.Mesh(engGeo, materials.hull);
    engineeringGroup.add(engMesh);

    // --- Deflector Dish (Front Bottom) ---
    const deflectorGroup = new THREE.Group();
    // Position at the front-bottom
    deflectorGroup.position.set(0, -engHeight * 0.25, engLength * 0.45);
    
    // Dish itself (Parabolic)
    const dishPoints = [];
    for(let i = 0; i <= 16; i++) {
        const r = (i / 16) * 3.5;
        // Parabola: z = a * r^2
        const z = 0.2 * r * r - 1.5;
        dishPoints.push(new THREE.Vector2(r, z));
    }
    const dishGeo = new THREE.LatheGeometry(dishPoints, 64);
    dishGeo.rotateX(Math.PI / 2);
    
    const deflectorMesh = new THREE.Mesh(dishGeo, materials.deflector);
    deflectorGroup.add(deflectorMesh);
    refs.deflectorDish = deflectorMesh;
    
    // Deflector Housing Ring
    const deflectorHousingGeo = new THREE.TorusGeometry(3.6, 0.4, 16, 64);
    const deflectorHousing = new THREE.Mesh(deflectorHousingGeo, materials.hullDark);
    deflectorHousing.position.z = 1.0;
    deflectorGroup.add(deflectorHousing);
    
    engineeringGroup.add(deflectorGroup);

    // --- Shuttlebay (Rear) ---
    const shuttlebayGroup = new THREE.Group();
    shuttlebayGroup.position.set(0, engHeight * 0.1, -engLength * 0.48);
    
    const shuttlebayCutGeo = new THREE.BoxGeometry(6, 3, 2);
    const shuttlebayMesh = new THREE.Mesh(shuttlebayCutGeo, materials.hullDark);
    shuttlebayGroup.add(shuttlebayMesh);
    
    const shuttlebayDoorGeo = new THREE.PlaneGeometry(5.8, 2.8);
    const shuttlebayDoor = new THREE.Mesh(shuttlebayDoorGeo, materials.shuttlebayFloor);
    shuttlebayDoor.rotation.y = Math.PI; // Face backwards
    shuttlebayDoor.position.z = -1.01;
    shuttlebayGroup.add(shuttlebayDoor);
    
    refs.shuttlebayDoor = shuttlebayDoor;
    engineeringGroup.add(shuttlebayGroup);

    // --- Torpedo Launchers ---
    // Forward Launcher (Neck base area)
    const torpGeo = new THREE.BoxGeometry(2, 0.8, 2);
    const fwdTorp = new THREE.Mesh(torpGeo, materials.hullDark);
    fwdTorp.position.set(0, engHeight * 0.4, engLength * 0.3);
    engineeringGroup.add(fwdTorp);

    // Aft Launcher
    const aftTorp = new THREE.Mesh(torpGeo, materials.hullDark);
    aftTorp.position.set(0, engHeight * 0.3, -engLength * 0.45);
    engineeringGroup.add(aftTorp);

    // --- Tractor Beam Emitter (Bottom) ---
    const tractorGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32);
    const tractorMesh = new THREE.Mesh(tractorGeo, materials.deflector); // Uses deflector glow
    tractorMesh.position.set(0, -engHeight * 0.49, 0);
    engineeringGroup.add(tractorMesh);

    // --- Windows Engineering (InstancedMesh) ---
    const engWindowInstanced = new THREE.InstancedMesh(windowGeo, materials.window, 200);
    let engWinIdx = 0;
    for (let i = 0; i < 200; i++) {
        // Distribute along sides
        const side = i % 2 === 0 ? 1 : -1;
        const zPos = (Math.random() - 0.5) * engLength * 0.6;
        const yPos = (Math.random() - 0.5) * engHeight * 0.5;
        
        // Approximate x position on the surface of the hull
        // Scale radius based on zPos
        const t = (zPos + engLength/2) / engLength; // 0 to 1
        let rBase;
        if (t > 0.8) {
            const noseT = (t - 0.8) / 0.2;
            rBase = Math.cos(noseT * Math.PI / 2) * (engWidth / 2);
        } else {
            const bodyT = t / 0.8;
            rBase = (engWidth / 2) * (0.6 + 0.4 * Math.sin(bodyT * Math.PI));
        }
        
        // Height scale factor
        const hScale = engHeight / engWidth;
        // Ellipse eq: (x/a)^2 + (y/b)^2 = 1 => x = a * sqrt(1 - (y/b)^2)
        const a = rBase;
        const b = rBase * hScale;
        
        // Check if y is within the bounds of the ellipse
        if (Math.abs(yPos) > b * 0.95) continue; // Skip if too close to top/bottom
        
        const xPos = side * a * Math.sqrt(1 - Math.pow(yPos / b, 2)) + (side * 0.1);
        
        dummy.position.set(xPos, yPos, zPos);
        dummy.rotation.y = side * Math.PI / 2;
        // Slope based on height
        dummy.rotation.z = side * (yPos / b) * 0.5; 
        
        dummy.updateMatrix();
        engWindowInstanced.setMatrixAt(engWinIdx++, dummy.matrix);
    }
    engWindowInstanced.count = engWinIdx;
    engineeringGroup.add(engWindowInstanced);


    // ==========================================
    // 3. NECK / DORSAL CONNECTION
    // ==========================================
    // Creates the graceful curved connection between saucer and engineering hull
    
    // Neck Shape (Side profile)
    const neckShape = new THREE.Shape();
    // Start at bottom rear
    neckShape.moveTo(-4, -2);
    // Go up and forward to top rear
    neckShape.lineTo(-1, 12);
    // Forward to top front
    neckShape.lineTo(7, 12);
    // Curve down and back to bottom front
    neckShape.quadraticCurveTo(2, 6, 4, -2);
    // Close shape
    neckShape.lineTo(-4, -2);
    
    const neckExtrude = {
        depth: 6,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 2,
        bevelSize: 0.5,
        bevelThickness: 0.5,
        curveSegments: 24
    };
    
    const neckGeo = new THREE.ExtrudeGeometry(neckShape, neckExtrude);
    // Center the extrusion along X axis
    neckGeo.translate(0, 0, -3);
    // Rotate to face forward (Extrude creates shape in XY plane, depth along Z)
    neckGeo.rotateY(-Math.PI / 2);
    
    const neckMesh = new THREE.Mesh(neckGeo, materials.hull);
    // Position it bridging the two hulls
    neckMesh.position.set(0, 5, 2);
    engineeringGroup.add(neckMesh);

    // Neck Windows (InstancedMesh)
    const neckWinInstanced = new THREE.InstancedMesh(windowGeo, materials.window, 80);
    let nWinIdx = 0;
    for(let i=0; i < 40; i++) {
        // Port side
        dummy.position.set(-3.1, Math.random() * 10 + 1, Math.random() * 6);
        dummy.rotation.y = -Math.PI / 2;
        dummy.updateMatrix();
        neckWinInstanced.setMatrixAt(nWinIdx++, dummy.matrix);
        
        // Starboard side
        dummy.position.set(3.1, Math.random() * 10 + 1, Math.random() * 6);
        dummy.rotation.y = Math.PI / 2;
        dummy.updateMatrix();
        neckWinInstanced.setMatrixAt(nWinIdx++, dummy.matrix);
    }
    engineeringGroup.add(neckWinInstanced);


    // ==========================================
    // 4. NACELLE PYLONS
    // ==========================================
    // Swept-back aerodynamic struts
    
    const pylonShape = new THREE.Shape();
    // Base at engineering hull
    pylonShape.moveTo(-3, -2);
    // Top at nacelle connection
    pylonShape.lineTo(-5, 14);
    pylonShape.lineTo(3, 14);
    pylonShape.lineTo(4, -2);
    pylonShape.lineTo(-3, -2);
    
    const pylonExtrude = {
        depth: 3,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.3,
        bevelThickness: 0.4
    };
    
    const pylonGeo = new THREE.ExtrudeGeometry(pylonShape, pylonExtrude);
    pylonGeo.center(); // Center the geometry geometry for easier positioning
    pylonGeo.rotateY(Math.PI / 2);
    // Sweep back angle
    pylonGeo.rotateX(-Math.PI / 8);

    // Left Pylon
    const pylonLeft = new THREE.Mesh(pylonGeo, materials.hull);
    // Start at engineering hull sides (approx x=-6, z=-8), go up and back
    pylonLeft.position.set(-9, 5, -8);
    // Angle outwards
    pylonLeft.rotation.z = Math.PI / 12;
    engineeringGroup.add(pylonLeft);

    // Right Pylon (Mirrored)
    const pylonRight = new THREE.Mesh(pylonGeo, materials.hull);
    pylonRight.position.set(9, 5, -8);
    pylonRight.rotation.z = -Math.PI / 12;
    // Scale X by -1 to mirror perfectly
    pylonRight.scale.x = -1;
    // Fix normals after negative scaling
    pylonRight.geometry = pylonGeo.clone();
    // Reverse vertex winding order to fix normal inversion due to scale.x = -1
    // A simpler way is just to not scale.x = -1, but flip rotation:
    pylonRight.scale.x = 1;
    pylonRight.rotation.y = Math.PI; // Face backwards? No, mirror geometry properly.
    
    // Better way: Re-create geometry mirrored
    const pylonShapeRight = new THREE.Shape();
    pylonShapeRight.moveTo(-4, -2);
    pylonShapeRight.lineTo(-3, 14);
    pylonShapeRight.lineTo(5, 14);
    pylonShapeRight.lineTo(3, -2);
    pylonShapeRight.lineTo(-4, -2);
    
    const pylonGeoRight = new THREE.ExtrudeGeometry(pylonShapeRight, pylonExtrude);
    pylonGeoRight.center();
    pylonGeoRight.rotateY(Math.PI / 2);
    pylonGeoRight.rotateX(-Math.PI / 8);
    
    const pylonRightMesh = new THREE.Mesh(pylonGeoRight, materials.hull);
    pylonRightMesh.position.set(9, 5, -8);
    pylonRightMesh.rotation.z = -Math.PI / 12;
    engineeringGroup.add(pylonRightMesh);


    // ==========================================
    // 5. WARP NACELLES
    // ==========================================
    const nacelleLength = 40;
    const nacelleRadius = 2.5;

    function createNacelle(isLeft) {
        const nGroup = new THREE.Group();
        nGroup.name = isLeft ? 'Nacelle_Left' : 'Nacelle_Right';
        
        // --- Main Cylinder Body ---
        // Top profile is flatter, bottom is rounded
        const nGeo = new THREE.CylinderGeometry(nacelleRadius * 0.9, nacelleRadius * 1.1, nacelleLength, 32);
        nGeo.rotateX(Math.PI / 2);
        // Flatten the top slightly
        nGeo.scale(1, 0.8, 1);
        const nMesh = new THREE.Mesh(nGeo, materials.hull);
        nGroup.add(nMesh);
        
        // --- Bussard Collector (Front) ---
        const bussardGroup = new THREE.Group();
        bussardGroup.position.z = nacelleLength / 2;
        
        // Outer red glowing dome
        const bussardGeo = new THREE.SphereGeometry(nacelleRadius * 1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        bussardGeo.rotateX(Math.PI / 2);
        bussardGeo.scale(1, 0.9, 1);
        const bussardMesh = new THREE.Mesh(bussardGeo, materials.bussard);
        bussardGroup.add(bussardMesh);
        
        // Inner detail (Spinner)
        const spinnerGeo = new THREE.ConeGeometry(nacelleRadius * 0.8, 1.5, 16);
        spinnerGeo.rotateX(-Math.PI / 2);
        const spinnerMesh = new THREE.Mesh(spinnerGeo, materials.hullDark);
        spinnerMesh.position.z = 0.2;
        bussardGroup.add(spinnerMesh);
        
        nGroup.add(bussardGroup);
        
        // --- Warp Grille (Inner side glowing blue strip) ---
        const grilleLength = nacelleLength * 0.75;
        const grilleHeight = nacelleRadius * 1.2;
        const grilleGeo = new THREE.PlaneGeometry(grilleLength, grilleHeight);
        const grilleMesh = new THREE.Mesh(grilleGeo, materials.warpGlow);
        
        // Position on the inside face
        grilleMesh.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
        grilleMesh.position.x = isLeft ? nacelleRadius * 0.95 : -nacelleRadius * 0.95;
        grilleMesh.position.z = nacelleLength * 0.05; // Slightly forward
        nGroup.add(grilleMesh);

        // --- Grille Details (Bars) ---
        const barGeo = new THREE.BoxGeometry(0.1, grilleHeight + 0.2, 0.2);
        const barInstanced = new THREE.InstancedMesh(barGeo, materials.hullDark, 20);
        for(let i=0; i<20; i++) {
            const zOff = -grilleLength/2 + (i / 19) * grilleLength;
            dummy.position.set(isLeft ? nacelleRadius * 1.0 : -nacelleRadius * 1.0, 0, zOff + nacelleLength * 0.05);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            barInstanced.setMatrixAt(i, dummy.matrix);
        }
        nGroup.add(barInstanced);

        // --- Aft End Cap ---
        const endGeo = new THREE.CylinderGeometry(nacelleRadius * 1.1, nacelleRadius * 0.5, 3, 32);
        endGeo.rotateX(Math.PI / 2);
        endGeo.scale(1, 0.8, 1);
        const endMesh = new THREE.Mesh(endGeo, materials.hullDark);
        endMesh.position.z = -nacelleLength / 2 - 1.5;
        nGroup.add(endMesh);

        // --- Nacelle Pennant / Text ---
        const nacelleTextCanvas = document.createElement('canvas');
        nacelleTextCanvas.width = 512;
        nacelleTextCanvas.height = 64;
        const nCtx = nacelleTextCanvas.getContext('2d');
        nCtx.clearRect(0, 0, 512, 64);
        nCtx.font = 'Bold 48px "Arial Black", sans-serif';
        nCtx.fillStyle = '#111111';
        nCtx.textAlign = 'center';
        nCtx.textBaseline = 'middle';
        nCtx.fillText('NCC-1701-D', 256, 32);
        
        const nTextTex = new THREE.CanvasTexture(nacelleTextCanvas);
        nTextTex.anisotropy = 16;
        const nTextMat = new THREE.MeshStandardMaterial({
            map: nTextTex,
            transparent: true,
            opacity: 0.9,
            roughness: 0.8,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        
        const nNameGeo = new THREE.PlaneGeometry(12, 1.5);
        const nNameMesh = new THREE.Mesh(nNameGeo, nTextMat);
        // Position on the OUTSIDE face
        nNameMesh.rotation.y = isLeft ? -Math.PI / 2 : Math.PI / 2;
        nNameMesh.position.x = isLeft ? -nacelleRadius * 0.95 : nacelleRadius * 0.95;
        nNameMesh.position.z = nacelleLength * 0.2;
        nGroup.add(nNameMesh);

        return { nGroup, bussardMesh, grilleMesh };
    }

    // Nacelles positioned globally at approx (±11, 12, -12)
    // Relative to engineeringGroup (0,0,-8), that is (±11, 12, -4)
    
    // Left Nacelle
    const nacelleLeftData = createNacelle(true);
    nacelleLeftData.nGroup.position.set(-11, 12, -4); 
    engineeringGroup.add(nacelleLeftData.nGroup);
    
    refs.bussardLeft = nacelleLeftData.bussardMesh;
    refs.nacelleGlowLeft = nacelleLeftData.grilleMesh;

    // Right Nacelle
    const nacelleRightData = createNacelle(false);
    nacelleRightData.nGroup.position.set(11, 12, -4);
    engineeringGroup.add(nacelleRightData.nGroup);

    refs.bussardRight = nacelleRightData.bussardMesh;
    refs.nacelleGlowRight = nacelleRightData.grilleMesh;


    return { group, refs };
}
