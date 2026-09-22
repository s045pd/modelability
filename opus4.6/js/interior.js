import * as THREE from 'three';
import { materials, createLCARSTexture } from './materials.js';

export function createInterior() {
  const group = new THREE.Group();
  group.name = "EnterpriseInterior";

  const refs = {
    warpCore: null,
    warpCorePulse: null,
    doors: [],
    redAlertLights: [],
    viewscreen: null,
    consoleScreens: [],
  };

  const teleportPoints = {
    bridge:      { position: new THREE.Vector3(0, 11.2, 14), lookAt: new THREE.Vector3(0, 11.2, 20) },
    observation: { position: new THREE.Vector3(0, 11.2, 9), lookAt: new THREE.Vector3(0, 11.2, 6) },
    tenforward:  { position: new THREE.Vector3(0, 7.7, 33), lookAt: new THREE.Vector3(0, 7.7, 37) },
    quarters:    { position: new THREE.Vector3(7, 7.7, 14), lookAt: new THREE.Vector3(10, 7.7, 14) },
    engineering: { position: new THREE.Vector3(0, 0.7, -8), lookAt: new THREE.Vector3(0, 0.7, -12) },
    corridor1:   { position: new THREE.Vector3(0, 7.7, 12), lookAt: new THREE.Vector3(0, 7.7, 8) },
  };

  const collisionMeshes = [];

  // ==== HELPER FUNCTIONS ====

  function addCollision(mesh) {
    collisionMeshes.push(mesh);
  }

  function createRedAlertLight(parentGroup, position) {
    const lightGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);
    const lightMesh = new THREE.Mesh(lightGeo, materials.redAlert);
    lightMesh.position.copy(position);
    parentGroup.add(lightMesh);
    refs.redAlertLights.push(lightMesh);
    return lightMesh;
  }

  function createDoor(parentGroup, position, rotation, width, height, roomName) {
    const doorGroup = new THREE.Group();
    doorGroup.position.copy(position);
    doorGroup.rotation.y = rotation;

    // Door frame
    const frameGeo = new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.2);
    const frameMesh = new THREE.Mesh(frameGeo, materials.interiorWall);
    frameMesh.position.y = height / 2;
    doorGroup.add(frameMesh);
    addCollision(frameMesh);

    // Left door panel
    const panelGeo = new THREE.BoxGeometry(width / 2, height, 0.05);
    const leftPanel = new THREE.Mesh(panelGeo, materials.door);
    leftPanel.position.set(-width / 4, height / 2, 0);
    doorGroup.add(leftPanel);
    addCollision(leftPanel);

    // Right door panel
    const rightPanel = new THREE.Mesh(panelGeo, materials.door);
    rightPanel.position.set(width / 4, height / 2, 0);
    doorGroup.add(rightPanel);
    addCollision(rightPanel);

    parentGroup.add(doorGroup);

    refs.doors.push({
      meshGroup: doorGroup,
      leftPanel: leftPanel,
      rightPanel: rightPanel,
      openPosLeft: new THREE.Vector3(-width * 0.75, height / 2, 0),
      closedPosLeft: new THREE.Vector3(-width / 4, height / 2, 0),
      openPosRight: new THREE.Vector3(width * 0.75, height / 2, 0),
      closedPosRight: new THREE.Vector3(width / 4, height / 2, 0),
      isOpen: false,
      roomName: roomName
    });

    return doorGroup;
  }

  function createChair(parentGroup, position, rotationY) {
    const chairGroup = new THREE.Group();
    chairGroup.position.copy(position);
    chairGroup.rotation.y = rotationY;

    // Base
    const baseGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.4, 16);
    const baseMesh = new THREE.Mesh(baseGeo, materials.console);
    baseMesh.position.y = 0.2;
    chairGroup.add(baseMesh);

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
    const seatMesh = new THREE.Mesh(seatGeo, materials.chair);
    seatMesh.position.y = 0.45;
    chairGroup.add(seatMesh);
    addCollision(seatMesh);

    // Backrest
    const backGeo = new THREE.BoxGeometry(0.6, 0.6, 0.1);
    const backMesh = new THREE.Mesh(backGeo, materials.chair);
    backMesh.position.set(0, 0.8, -0.25);
    chairGroup.add(backMesh);
    addCollision(backMesh);

    // Armrests
    const armGeo = new THREE.BoxGeometry(0.1, 0.2, 0.5);
    const leftArm = new THREE.Mesh(armGeo, materials.console);
    leftArm.position.set(-0.35, 0.6, 0);
    chairGroup.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, materials.console);
    rightArm.position.set(0.35, 0.6, 0);
    chairGroup.add(rightArm);

    parentGroup.add(chairGroup);
    return chairGroup;
  }

  function createConsole(parentGroup, position, rotationY, width, hasScreen) {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.copy(position);
    consoleGroup.rotation.y = rotationY;

    // Base desk
    const deskGeo = new THREE.BoxGeometry(width, 0.8, 0.6);
    const deskMesh = new THREE.Mesh(deskGeo, materials.console);
    deskMesh.position.set(0, 0.4, 0);
    consoleGroup.add(deskMesh);
    addCollision(deskMesh);

    // Angled control panel
    const panelGeo = new THREE.BoxGeometry(width, 0.4, 0.5);
    const panelMesh = new THREE.Mesh(panelGeo, materials.console);
    panelMesh.position.set(0, 0.9, -0.1);
    panelMesh.rotation.x = Math.PI / 6;
    consoleGroup.add(panelMesh);
    addCollision(panelMesh);

    if (hasScreen) {
      const screenGeo = new THREE.PlaneGeometry(width * 0.9, 0.35);
      const screenTex = createLCARSTexture(512, 128, materials.lcarsOrange.color.getHex());
      const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.set(0, 0.92, 0.05);
      screenMesh.rotation.x = Math.PI / 6;
      consoleGroup.add(screenMesh);
      refs.consoleScreens.push(screenMesh);
    }

    parentGroup.add(consoleGroup);
    return consoleGroup;
  }

  function createLCARSPanel(parentGroup, position, rotationY, width, height, colorType) {
    const geo = new THREE.PlaneGeometry(width, height);
    const tex = createLCARSTexture(256, 512, colorType === 'blue' ? 0x4488ff : 0xff9900);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.rotation.y = rotationY;
    parentGroup.add(mesh);
    refs.consoleScreens.push(mesh);
    return mesh;
  }

  // ==== ROOM: MAIN BRIDGE ====
  function buildBridge() {
    const bridge = new THREE.Group();
    bridge.position.set(0, 10.5, 14);
    group.add(bridge);

    const radius = 5;
    const height = 3;

    // Floor
    const floorGeo = new THREE.CylinderGeometry(radius, radius, 0.1, 32);
    const floorMesh = new THREE.Mesh(floorGeo, materials.interiorFloor);
    bridge.add(floorMesh);
    addCollision(floorMesh);

    // Walls
    const wallGeo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
    const wallMesh = new THREE.Mesh(wallGeo, materials.interiorWall);
    wallMesh.material.side = THREE.BackSide;
    wallMesh.position.y = height / 2;
    bridge.add(wallMesh);
    addCollision(wallMesh);

    // Ceiling dome
    const ceilingGeo = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 4);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, materials.interiorCeiling);
    ceilingMesh.material.side = THREE.BackSide;
    ceilingMesh.position.y = height - 0.5;
    ceilingMesh.scale.y = 0.4;
    bridge.add(ceilingMesh);

    // Command well (lowered center)
    const wellGeo = new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, 0.2, 32);
    const wellMesh = new THREE.Mesh(wellGeo, materials.interiorFloor);
    wellMesh.position.y = -0.05;
    bridge.add(wellMesh);

    // Railing around well
    const railingGeo = new THREE.TorusGeometry(radius * 0.6, 0.05, 8, 32, Math.PI * 1.2);
    const railingMesh = new THREE.Mesh(railingGeo, materials.railing);
    railingMesh.position.set(0, 0.8, 0);
    railingMesh.rotation.x = Math.PI / 2;
    railingMesh.rotation.z = -Math.PI * 0.6;
    bridge.add(railingMesh);

    // Captain's Chair
    createChair(bridge, new THREE.Vector3(0, 0, 0), 0);
    
    // First Officer & Counselor Chairs
    createChair(bridge, new THREE.Vector3(-1.2, 0, 0.5), Math.PI / 12);
    createChair(bridge, new THREE.Vector3(1.2, 0, 0.5), -Math.PI / 12);

    // Helm and Ops
    createConsole(bridge, new THREE.Vector3(-1.5, 0, 2), Math.PI / 8, 1.5, true);
    createConsole(bridge, new THREE.Vector3(1.5, 0, 2), -Math.PI / 8, 1.5, true);
    createChair(bridge, new THREE.Vector3(-1.5, 0, 1.2), 0);
    createChair(bridge, new THREE.Vector3(1.5, 0, 1.2), 0);

    // Tactical Station (Horseshoe)
    const tacticalGroup = new THREE.Group();
    tacticalGroup.position.set(0, 0.3, -2.5); // raised slightly
    const archGeo = new THREE.TorusGeometry(2, 0.4, 8, 16, Math.PI);
    const archMesh = new THREE.Mesh(archGeo, materials.console);
    archMesh.rotation.x = Math.PI / 2;
    tacticalGroup.add(archMesh);
    addCollision(archMesh);
    
    // Tactical Screen
    const tacScreenGeo = new THREE.PlaneGeometry(3, 0.5);
    const tacScreenTex = createLCARSTexture(512, 128, materials.lcarsRed ? materials.lcarsRed.color.getHex() : 0xff3300);
    const tacScreenMat = new THREE.MeshBasicMaterial({ map: tacScreenTex });
    const tacScreenMesh = new THREE.Mesh(tacScreenGeo, tacScreenMat);
    tacScreenMesh.position.set(0, 0.4, -0.3);
    tacScreenMesh.rotation.x = -Math.PI / 4;
    tacticalGroup.add(tacScreenMesh);
    refs.consoleScreens.push(tacScreenMesh);

    bridge.add(tacticalGroup);

    // Main Viewscreen
    const screenGeo = new THREE.CylinderGeometry(radius - 0.1, radius - 0.1, 2.5, 16, 1, true, -Math.PI/6, Math.PI/3);
    const screenMesh = new THREE.Mesh(screenGeo, materials.viewscreen);
    screenMesh.material.side = THREE.BackSide;
    screenMesh.position.y = 1.5;
    screenMesh.rotation.y = Math.PI; // Front
    bridge.add(screenMesh);
    refs.viewscreen = screenMesh;

    // Science / Engineering wall consoles
    createConsole(bridge, new THREE.Vector3(3.5, 0.3, -1), -Math.PI / 3, 2, true);
    createConsole(bridge, new THREE.Vector3(-3.5, 0.3, -1), Math.PI / 3, 2, true);

    // Doors
    createDoor(bridge, new THREE.Vector3(-2.5, 0, -4), Math.PI / 4, 1.5, 2.2, "Turbolift Left");
    createDoor(bridge, new THREE.Vector3(2.5, 0, -4), -Math.PI / 4, 1.5, 2.2, "Turbolift Right");
    createDoor(bridge, new THREE.Vector3(4, 0, -2.5), -Math.PI / 3, 1.5, 2.2, "Observation Lounge");

    // Red alert lights
    createRedAlertLight(bridge, new THREE.Vector3(2, 2.8, 2));
    createRedAlertLight(bridge, new THREE.Vector3(-2, 2.8, 2));
    createRedAlertLight(bridge, new THREE.Vector3(2, 2.8, -2));
    createRedAlertLight(bridge, new THREE.Vector3(-2, 2.8, -2));
  }

  // ==== ROOM: OBSERVATION LOUNGE ====
  function buildObservationLounge() {
    const lounge = new THREE.Group();
    lounge.position.set(0, 10.5, 8);
    group.add(lounge);

    const width = 8;
    const depth = 4;
    const height = 2.8;

    // Floor
    const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const floorMesh = new THREE.Mesh(floorGeo, materials.interiorFloor);
    lounge.add(floorMesh);
    addCollision(floorMesh);

    // Walls
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wallMesh = new THREE.Mesh(wallGeo, materials.interiorWall);
    wallMesh.material.side = THREE.BackSide;
    wallMesh.position.y = height / 2;
    lounge.add(wallMesh);
    addCollision(wallMesh);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(width, depth);
    const ceilMesh = new THREE.Mesh(ceilGeo, materials.interiorCeiling);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.y = height;
    lounge.add(ceilMesh);

    // Conference Table
    const tableGeo = new THREE.BoxGeometry(4, 0.1, 1.5);
    const tableMesh = new THREE.Mesh(tableGeo, materials.console);
    tableMesh.position.set(0, 0.8, 0);
    lounge.add(tableMesh);
    addCollision(tableMesh);

    // Table pedestal
    const pedGeo = new THREE.CylinderGeometry(0.4, 0.6, 0.8, 16);
    const pedMesh = new THREE.Mesh(pedGeo, materials.console);
    pedMesh.position.set(0, 0.4, 0);
    lounge.add(pedMesh);

    // Chairs around table
    for (let i = 0; i < 3; i++) {
      createChair(lounge, new THREE.Vector3(-1.2 + i * 1.2, 0, 1.2), Math.PI);
      createChair(lounge, new THREE.Vector3(-1.2 + i * 1.2, 0, -1.2), 0);
    }
    createChair(lounge, new THREE.Vector3(-2.5, 0, 0), -Math.PI / 2);
    createChair(lounge, new THREE.Vector3(2.5, 0, 0), Math.PI / 2);

    // Windows (Rear wall of lounge, looking backwards)
    const windowGeo = new THREE.PlaneGeometry(6, 1.5);
    const windowMesh = new THREE.Mesh(windowGeo, materials.transparentWindow);
    windowMesh.position.set(0, 1.5, -depth / 2 + 0.05);
    lounge.add(windowMesh);

    // Wall displays
    createLCARSPanel(lounge, new THREE.Vector3(width / 2 - 0.05, 1.5, 0), -Math.PI / 2, 2, 1, 'orange');
    createLCARSPanel(lounge, new THREE.Vector3(-width / 2 + 0.05, 1.5, 0), Math.PI / 2, 2, 1, 'blue');

    // Display case (gold models usually here)
    const caseGeo = new THREE.BoxGeometry(1, 0.5, 0.3);
    const caseMesh = new THREE.Mesh(caseGeo, materials.console);
    caseMesh.position.set(-width / 2 + 0.2, 1.5, 1);
    lounge.add(caseMesh);

    // Doors
    createDoor(lounge, new THREE.Vector3(width / 4, 0, depth / 2 - 0.1), 0, 1.5, 2.2, "To Bridge");
    
    // Red Alert
    createRedAlertLight(lounge, new THREE.Vector3(0, height - 0.1, 0));
  }

  // ==== ROOM: TEN FORWARD ====
  function buildTenForward() {
    const tenFwd = new THREE.Group();
    tenFwd.position.set(0, 7, 35);
    group.add(tenFwd);

    const width = 12;
    const depth = 8;
    const height = 3;

    // Curved Floor
    const floorShape = new THREE.Shape();
    floorShape.absarc(0, -2, 10, 0, Math.PI, false);
    const floorGeo = new THREE.ShapeGeometry(floorShape);
    const floorMesh = new THREE.Mesh(floorGeo, materials.interiorFloor);
    floorMesh.rotation.x = -Math.PI / 2;
    tenFwd.add(floorMesh);
    addCollision(floorMesh);

    // Ceiling
    const ceilMesh = new THREE.Mesh(floorGeo, materials.interiorCeiling);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.y = height;
    tenFwd.add(ceilMesh);

    // Back Wall (Straight)
    const backWallGeo = new THREE.BoxGeometry(width * 1.5, height, 0.5);
    const backWall = new THREE.Mesh(backWallGeo, materials.interiorWall);
    backWall.position.set(0, height / 2, -2);
    tenFwd.add(backWall);
    addCollision(backWall);

    // Front Windows (Curved)
    const windowGeo = new THREE.CylinderGeometry(10, 10, height, 32, 1, true, 0, Math.PI);
    const windowMesh = new THREE.Mesh(windowGeo, materials.transparentWindow);
    windowMesh.position.set(0, height / 2, -2);
    windowMesh.material.side = THREE.BackSide;
    tenFwd.add(windowMesh);

    // Bar Counter
    const barShape = new THREE.Shape();
    barShape.absarc(0, 0, 4, Math.PI * 0.1, Math.PI * 0.9, false);
    const barExtrudeOpts = { depth: 1, bevelEnabled: false };
    const barGeo = new THREE.ExtrudeGeometry(barShape, barExtrudeOpts);
    const barMesh = new THREE.Mesh(barGeo, materials.console);
    barMesh.rotation.x = -Math.PI / 2;
    barMesh.position.set(0, 0, -1);
    tenFwd.add(barMesh);
    addCollision(barMesh);

    // Bar stools
    for(let i=0; i<8; i++) {
      const angle = Math.PI * 0.2 + (i * 0.1);
      const px = Math.cos(angle) * 4.8;
      const pz = Math.sin(angle) * 4.8 - 1;
      createChair(tenFwd, new THREE.Vector3(px, 0, pz), angle + Math.PI/2);
    }

    // Tables
    const tableGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.05, 16);
    const pedGeo = new THREE.CylinderGeometry(0.1, 0.3, 0.8, 8);
    
    function createTableGroup(pos) {
      const tg = new THREE.Group();
      tg.position.copy(pos);
      
      const tMesh = new THREE.Mesh(tableGeo, materials.console);
      tMesh.position.y = 0.8;
      tg.add(tMesh);
      addCollision(tMesh);

      const pMesh = new THREE.Mesh(pedGeo, materials.console);
      pMesh.position.y = 0.4;
      tg.add(pMesh);

      createChair(tg, new THREE.Vector3(1, 0, 0), -Math.PI/2);
      createChair(tg, new THREE.Vector3(-1, 0, 0), Math.PI/2);
      createChair(tg, new THREE.Vector3(0, 0, 1), Math.PI);
      
      tenFwd.add(tg);
    }

    createTableGroup(new THREE.Vector3(-6, 0, 3));
    createTableGroup(new THREE.Vector3(6, 0, 3));
    createTableGroup(new THREE.Vector3(-4, 0, 5));
    createTableGroup(new THREE.Vector3(4, 0, 5));

    // Doors
    createDoor(tenFwd, new THREE.Vector3(-8, 0, -1.8), 0, 1.5, 2.2, "Corridor Left");
    createDoor(tenFwd, new THREE.Vector3(8, 0, -1.8), 0, 1.5, 2.2, "Corridor Right");

    createRedAlertLight(tenFwd, new THREE.Vector3(0, height - 0.1, 4));
  }

  // ==== ROOM: MAIN ENGINEERING ====
  function buildEngineering() {
    const eng = new THREE.Group();
    eng.position.set(0, 0, -10);
    group.add(eng);

    const width = 14;
    const depth = 10;
    const height = 6;

    // Floor (Lower)
    const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const floorMesh = new THREE.Mesh(floorGeo, materials.shuttlebayFloor);
    eng.add(floorMesh);
    addCollision(floorMesh);

    // Upper Walkway
    const walkGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const walkMesh = new THREE.Mesh(walkGeo, materials.shuttlebayFloor);
    walkMesh.position.y = 3;
    
    // Create a hole in the walkway for the warp core and stairs
    const walkHoleGeo = new THREE.CylinderGeometry(3, 3, 0.2, 32);
    // Simple CSG isn't standard in Three, so we use multiple boxes for the walkway
    
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 2), materials.shuttlebayFloor);
    w1.position.set(0, 3, -4);
    eng.add(w1); addCollision(w1);

    const w2 = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 2), materials.shuttlebayFloor);
    w2.position.set(0, 3, 4);
    eng.add(w2); addCollision(w2);

    const w3 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 6), materials.shuttlebayFloor);
    w3.position.set(-5, 3, 0);
    eng.add(w3); addCollision(w3);

    const w4 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 6), materials.shuttlebayFloor);
    w4.position.set(5, 3, 0);
    eng.add(w4); addCollision(w4);

    // Walls
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wallMesh = new THREE.Mesh(wallGeo, materials.interiorWall);
    wallMesh.material.side = THREE.BackSide;
    wallMesh.position.y = height / 2;
    eng.add(wallMesh);
    addCollision(wallMesh);

    // Warp Core
    const coreGroup = new THREE.Group();
    eng.add(coreGroup);

    const coreGeo = new THREE.CylinderGeometry(0.8, 0.8, height, 32);
    const coreMesh = new THREE.Mesh(coreGeo, materials.warpCore);
    coreMesh.position.y = height / 2;
    coreGroup.add(coreMesh);
    refs.warpCore = coreMesh;

    // Warp Core Pulse (Inner glowing rings)
    const pulseGeo = new THREE.TorusGeometry(0.85, 0.1, 8, 32);
    const pulseMesh = new THREE.Mesh(pulseGeo, materials.warpCore);
    pulseMesh.rotation.x = Math.PI / 2;
    pulseMesh.position.y = 1;
    coreGroup.add(pulseMesh);
    refs.warpCorePulse = pulseMesh;

    // Containment Rings
    for (let y = 0.5; y < height; y += 1) {
      const ringGeo = new THREE.TorusGeometry(1, 0.05, 8, 32);
      const ringMesh = new THREE.Mesh(ringGeo, materials.warpCoreFrame);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = y;
      coreGroup.add(ringMesh);
    }
    
    // Master Systems Display
    const msdGeo = new THREE.PlaneGeometry(6, 2.5);
    const msdTex = createLCARSTexture(1024, 512, 0x4488ff);
    const msdMat = new THREE.MeshBasicMaterial({ map: msdTex });
    const msdMesh = new THREE.Mesh(msdGeo, msdMat);
    msdMesh.position.set(0, 1.5, -depth / 2 + 0.1);
    eng.add(msdMesh);
    refs.consoleScreens.push(msdMesh);

    const msdDesk = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 1), materials.console);
    msdDesk.position.set(0, 0.5, -depth / 2 + 0.5);
    eng.add(msdDesk);
    addCollision(msdDesk);

    // Consoles around core
    createConsole(eng, new THREE.Vector3(2.5, 0, 0), Math.PI/2, 2, true);
    createConsole(eng, new THREE.Vector3(-2.5, 0, 0), -Math.PI/2, 2, true);

    // Doors
    createDoor(eng, new THREE.Vector3(-width/2 + 0.1, 0, 0), Math.PI/2, 1.5, 2.2, "To Corridor");

    createRedAlertLight(eng, new THREE.Vector3(0, height - 0.2, 0));
  }

  // ==== ROOM: CORRIDORS ====
  function buildCorridor() {
    const corr = new THREE.Group();
    corr.position.set(0, 7.7, 14);
    group.add(corr);

    const length = 20;
    const width = 2.5;
    const height = 2.8;

    // Main segment
    const floorGeo = new THREE.BoxGeometry(width, 0.1, length);
    const floorMesh = new THREE.Mesh(floorGeo, materials.interiorFloor);
    corr.add(floorMesh);
    addCollision(floorMesh);

    const ceilGeo = new THREE.BoxGeometry(width, 0.1, length);
    const ceilMesh = new THREE.Mesh(ceilGeo, materials.interiorCeiling);
    ceilMesh.position.y = height;
    corr.add(ceilMesh);

    // Archway supports along corridor
    for (let z = -length/2; z <= length/2; z += 4) {
      const archGroup = new THREE.Group();
      archGroup.position.z = z;

      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, height, 0.5), materials.interiorWall);
      leftPillar.position.set(-width/2, height/2, 0);
      archGroup.add(leftPillar);
      addCollision(leftPillar);

      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, height, 0.5), materials.interiorWall);
      rightPillar.position.set(width/2, height/2, 0);
      archGroup.add(rightPillar);
      addCollision(rightPillar);

      corr.add(archGroup);
      
      // Add LCARS between pillars
      if (z < length/2) {
        createLCARSPanel(corr, new THREE.Vector3(-width/2 + 0.1, 1.5, z + 2), Math.PI/2, 1, 0.5, 'blue');
        createLCARSPanel(corr, new THREE.Vector3(width/2 - 0.1, 1.5, z + 2), -Math.PI/2, 1, 0.5, 'orange');
      }
    }

    // Door to crew quarters
    createDoor(corr, new THREE.Vector3(width/2, 0, 0), -Math.PI/2, 1.5, 2.2, "Crew Quarters");
    createRedAlertLight(corr, new THREE.Vector3(0, height - 0.1, 0));
  }

  // ==== ROOM: CREW QUARTERS ====
  function buildCrewQuarters() {
    const qGroup = new THREE.Group();
    qGroup.position.set(7, 7.7, 14); // Next to corridor
    group.add(qGroup);

    const width = 5;
    const depth = 4;
    const height = 2.8;

    // Floor
    const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const floorMesh = new THREE.Mesh(floorGeo, materials.interiorFloor);
    qGroup.add(floorMesh);
    addCollision(floorMesh);

    // Walls
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wallMesh = new THREE.Mesh(wallGeo, materials.interiorWall);
    wallMesh.material.side = THREE.BackSide;
    wallMesh.position.y = height / 2;
    qGroup.add(wallMesh);
    addCollision(wallMesh);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(width, depth);
    const ceilMesh = new THREE.Mesh(ceilGeo, materials.interiorCeiling);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.y = height;
    qGroup.add(ceilMesh);

    // Bed
    const bedGeo = new THREE.BoxGeometry(2, 0.6, 1.5);
    const bedMesh = new THREE.Mesh(bedGeo, materials.chair); // Using chair mat for upholstery
    bedMesh.position.set(width/2 - 1.2, 0.3, -depth/2 + 1);
    qGroup.add(bedMesh);
    addCollision(bedMesh);

    // Desk
    createConsole(qGroup, new THREE.Vector3(-width/2 + 1, 0, -depth/2 + 0.8), 0, 1.5, true);
    createChair(qGroup, new THREE.Vector3(-width/2 + 1, 0, -depth/2 + 1.8), 0);

    // Replicator (Wall niche)
    const repGeo = new THREE.BoxGeometry(0.8, 1, 0.2);
    const repMesh = new THREE.Mesh(repGeo, materials.console);
    repMesh.position.set(-width/2 + 0.1, 1.2, depth/2 - 1);
    qGroup.add(repMesh);
    createLCARSPanel(qGroup, new THREE.Vector3(-width/2 + 0.22, 1.5, depth/2 - 1), Math.PI/2, 0.6, 0.3, 'orange');

    // Outer Window
    const winGeo = new THREE.PlaneGeometry(1.5, 1);
    const winMesh = new THREE.Mesh(winGeo, materials.transparentWindow);
    winMesh.position.set(width/2 - 0.05, 1.5, depth/2 - 1);
    winMesh.rotation.y = -Math.PI/2;
    qGroup.add(winMesh);

    // Door connecting to corridor
    createDoor(qGroup, new THREE.Vector3(-width/2, 0, 0), Math.PI/2, 1.5, 2.2, "Corridor");
    
    createRedAlertLight(qGroup, new THREE.Vector3(0, height - 0.1, 0));
  }

  // Execute builders
  buildBridge();
  buildObservationLounge();
  buildTenForward();
  buildEngineering();
  buildCorridor();
  buildCrewQuarters();

  return {
    group,
    refs,
    teleportPoints,
    collisionMeshes
  };
}
