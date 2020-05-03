console.log("Working");
// const _ = require('lodash');
var config = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 0 },
      // debug: true
    }
  },
  plugins: {
    scene: [
      {
        plugin: PhaserMatterCollisionPlugin, // The plugin class
        key: "matterCollision", // Where to store in Scene.Systems, e.g. scene.sys.matterCollision
        mapping: "matterCollision" // Where to store in the Scene, e.g. scene.matterCollision
      }
    ]
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

window.onload = function () {
  game = new Phaser.Game(config);
  gui = new dat.GUI();

  setupGui();
}

const setupGui = () => {
  gui.add(settings, "ships", 1, 1000);
  gui.add(settings, "rocks", 1, 1000);
  gui.add(settings, "shipFriction", 0, 0.5);
  gui.add(settings, "thrust", 0, 1);
  gui.add(settings, "Apply");
  gui.add(settings, "Reset");

  let debugGui = gui.addFolder('debugGui');
  let debugs = [];

  debugs.push(debugGui.add(shipDebug, "showTarget", false));
  debugs.push(debugGui.add(shipDebug, "showFacing", false));
  debugs.push(debugGui.add(shipDebug, "showMomentum", false));
  _.each(debugs, function(d){
    d.onFinishChange(function(){
      Ship.applyDebugSettings();
    })
  });
}

const settings = {
  ships: 1,  // These number variables will cause a GUI slider element to be shown
  rocks: 1,
  shipFriction: 0.01,
  thrust: 0.1,
  "Apply": function(){
    controller.syncSettings();

    //add or remove ships
    while(ships.length < settings.ships){
      addShip();
      shipCollisionDetection();
    }
    while(ships.length > settings.ships){
      ships.pop().chassis.destroy();
      shipBodies.pop();
    }

    //add or remove rocks
    while(rocks.length < settings.rocks){
      addRock();
    }
    while(rocks.length > settings.rocks){
      rocks.pop().destroy();
    }

    //apply friction
    _.each(ships, function(s){
      s.chassis.body.frictionAir = controller.shipFriction;
    });
  },
  "Reset": function(){
    scene.scene.restart();
  }
}

const shipDebug = {
  showTarget: false,
  showFacing: false,
  showMomentum: false
}

const controller = {
  ships: settings.ships,
  rocks: settings.rocks,
  shipFriction: settings.shipFriction,
  thrust: settings.thrust,

  showShipMomentum: shipDebug.showTarget,
  showShipMomentum: shipDebug.showFacing,
  showShipMomentum: shipDebug.showMomentum,

  syncSettings: () => {
    controller.ships = settings.ships;
    controller.rocks = settings.rocks;
    controller.shipFriction = settings.shipFriction;
    controller.thrust = settings.thrust;
  },

  syncDebug: () => {

  }
}

let game;
let gui;
let scene;
const sceneWidth = window.innerWidth*2;
const sceneHeight = window.innerHeight*2;

const centerX = sceneWidth/2;
const centerY = sceneHeight/2;
let cursors;
let graphics;

let ship, line, line2, line3, line4, line5, rock, angle;
let shipShape = '0 0 20 10 0 20 5 10';
let octaRock = '20 10 17.071 17.071 10 20 2.929 17.071 0 10 2.929 2.929 10 0 17.071 2.929'

let ships = [];
let shipBodies = [];//There may be a better way, but for now we need this array to store all the "chassis" gameObjects to set collision detection.
let rocks = [];

let unsubscribe = ()=>{};



function preload (){
}

function create (){
  ships = [];
  rocks = [];
  lines = [];

  scene = game.scene.scenes[0];
  graphics = this.add.graphics();
  graphics.lineStyle(2, 0xffff00);

  game.scene.scenes[0].cameras.main.zoom = 0.5;
  game.scene.scenes[0].cameras.main.useBounds = true;
  cursors = this.input.keyboard.createCursorKeys();
  this.matter.world.setBounds(0, 0, sceneWidth, sceneHeight);

  for(x = 0; x < controller.ships; x ++){
    addShip();
  }

  for(x = 0; x < controller.rocks; x ++){
    addRock();
  }

  line = new Phaser.Geom.Line( centerX, 0, centerX, this.game.config.height);
  line2 = new Phaser.Geom.Line( 0, centerY, this.game.config.width, centerY);
  line3 = new Phaser.Geom.Line( 0, centerY, this.game.config.width, centerY);
  line4 = new Phaser.Geom.Line( 0, centerY, this.game.config.width, centerY);
  line5 = new Phaser.Geom.Line( 0, centerY, this.game.config.width, centerY);

  shipCollisionDetection();
}

function update (){
  graphics.clear();

  _.each(ships, function(s) {
    s.runAI(compensationCollectionLast);
    s.debug();
  })
}



class Ship {
  constructor(x = sceneWidth/2, y = sceneHeight/2, rot = -Math.PI/2, shape = shipShape){
    this.shape = shape;
    this.chassis = scene.add.polygon(x, y, this.shape);
    this.chassis.isStroked = true;
    scene.matter.add.gameObject(this.chassis, { shape: { type: 'fromVerts', verts: this.shape, flagInternal: true } });
    this.chassis.setMass(500).setRotation(rot);
    this.chassis.body.frictionAir = controller.shipFriction;
    this.target;
    this.targetLine = new Phaser.Geom.Line();
    this.facingLine = new Phaser.Geom.Line();
    this.momentumLine = new Phaser.Geom.Line();
    this.showTarget = shipDebug.showTarget;
    this.showFacing = shipDebug.showFacing;
    this.showMomentum = shipDebug.showMomentum;
  }

  static applyDebugSettings = function(){
    _.each(ships, function(s){
      s.showTarget = shipDebug.showTarget;
      s.showFacing = shipDebug.showFacing;
      s.showMomentum = shipDebug.showMomentum;
    })
  }

  addAngluarVelocity = function(force){
    this.chassis.setAngularVelocity(this.chassis.body.angularVelocity + force);
  }
  findClosestIn = function(selection){
    let self = this;
    let closest = selection[0];
    let shortDistance = Phaser.Math.Distance.Between(self.chassis.body.position.x, self.chassis.body.position.y, closest.body.position.x, closest.body.position.y);

    _.each(selection, function(obj){
      let distance = Phaser.Math.Distance.Between(self.chassis.body.position.x, self.chassis.body.position.y, obj.body.position.x, obj.body.position.y);
      if ( distance < shortDistance){
        closest = obj;
        shortDistance = distance;
      }
    });
    return closest;
  }
  angleBetweenClamped = function(){
    //This takes the difference between the angle between the ships facing angle and the angle to the target, then clamps it from -PI to PI.
    let angle
    if(arguments[0].type === "Polygon"){
      angle = Phaser.Math.Angle.Between(this.chassis.x, this.chassis.y, arguments[0].x, arguments[0].y);
    }else{
      angle = Phaser.Math.Angle.Between(this.chassis.x, this.chassis.y, arguments[0], arguments[1]);
    }
    let dif = this.chassis.rotation - angle;
    while (dif < -Math.PI){
      dif += 2* Math.PI;
    }
    while (dif > Math.PI){
      dif -= 2* Math.PI;
    }
    return dif;
  }
  runAI = function(AI){
    AI(this);
  }
  debug = function () {

    if (this.showTarget === true){
      this.targetLine.x1 = this.chassis.x;
      this.targetLine.y1 = this.chassis.y;
      this.targetLine.x2 = this.target.x;
      this.targetLine.y2 = this.target.y;

      graphics.lineStyle(2, 0xffff00);
      graphics.strokeLineShape(this.targetLine);
    }

    if (this.showFacing === true) {
      this.facingLine.x1 = this.chassis.x;
      this.facingLine.y1 = this.chassis.y;
      this.facingLine.x2 = this.chassis.x + Math.cos(this.chassis.rotation)*50;
      this.facingLine.y2 = this.chassis.y + Math.sin(this.chassis.rotation)*50;

      graphics.lineStyle(4, 0xff0000);
      graphics.strokeLineShape(this.facingLine);
    }
  }

}

const addShip = () => {
  let newShip = new Ship (Math.random()*sceneWidth, Math.random()*sceneHeight, Math.random()*2*Math.PI - Math.PI, shipShape);
  ships.push(newShip);
  shipBodies.push(newShip.chassis);
}

let shipCollisionDetection = () => {
  unsubscribe();
  unsubscribe = scene.matterCollision.addOnCollideStart({
    objectA: shipBodies,
    callback: eventData => {
      const {bodyB, gameObjectB} = eventData;
      if (gameObjectB) { //wrapping in null check in case I want to add more of this next check.
        if (gameObjectB.entityType === "Rock") {
          x = Math.floor(Math.random()*(sceneWidth-20) +10);
          y = Math.floor(Math.random()*(sceneHeight-20) +10);
          gameObjectB.setX(x);
          gameObjectB.setY(y);
        }
      }
    }
  });
}

let addRock = () => {
  rock = scene.add.polygon(Math.random()*sceneWidth, Math.random()*sceneHeight, octaRock);
  rock.isStroked = true;
  scene.matter.add.gameObject(rock, { shape: { type: 'fromVerts', verts: octaRock, flagInternal: true } });
  rock.setMass(300);
  rock.setSensor(true);
  rock.entityType = 'Rock';
  rocks.push(rock);
}

const basicCollection = (s) => {
  s.target = s.findClosestIn(rocks);
  let angleToTarget = s.angleBetweenClamped(s.target);
  if (angleToTarget<0)
    s.addAngluarVelocity(controller.thrust*0.1);
  if (angleToTarget>0)
    s.addAngluarVelocity(controller.thrust*-0.1);
  s.chassis.thrust(controller.thrust);
}
const revisedCollection = (s) => {
  s.target = s.findClosestIn(rocks);
  let angleToTarget = s.angleBetweenClamped(s.target);
  if (angleToTarget+s.chassis.body.angularVelocity<0)
    s.addAngluarVelocity(controller.thrust*0.1);
  if (angleToTarget+s.chassis.body.angularVelocity>0)
    s.addAngluarVelocity(controller.thrust*-0.1);
  s.chassis.thrust(controller.thrust);
}
const projectionCollection = (s) => {
  //this aims the ship at a point shifted by the negative vector of it's own velocity*10.
  s.target = s.findClosestIn(rocks);
  let angleToTarget = s.angleBetweenClamped(s.target.x-(s.chassis.body.velocity.x*10), s.target.y-(s.chassis.body.velocity.y*10));
  if (angleToTarget+s.chassis.body.angularVelocity<0)
    s.addAngluarVelocity(controller.thrust*0.1);
  if (angleToTarget+s.chassis.body.angularVelocity>0)
    s.addAngluarVelocity(controller.thrust*-0.1);
  s.chassis.thrust(controller.thrust);
}
const compensationCollection= (s) => {
  s.target = s.findClosestIn(rocks);
  let angleToTarget = s.angleBetweenClamped(s.target);
  let angle = Phaser.Math.Angle.Between(s.chassis.x, s.chassis.y, s.target.x, s.target.y);
  let angleOfMovement = Phaser.Math.Angle.Between(s.chassis.x, s.chassis.y, s.chassis.x+s.chassis.body.velocity.x, s.chassis.y+s.chassis.body.velocity.y);

  let dif = angleOfMovement - angle;
  while (dif < -Math.PI){
    dif += 2* Math.PI;
  }
  while (dif > Math.PI){
    dif -= 2* Math.PI;
  }

  if (dif < Math.PI/24){
    angleToTarget -= Math.PI/13
  }
  if (dif > -Math.PI/24){
    angleToTarget += Math.PI/13
  }

  if (angleToTarget+s.chassis.body.angularVelocity*2<0)
    s.addAngluarVelocity(controller.thrust*0.1);
  if (angleToTarget+s.chassis.body.angularVelocity*2>0)
    s.addAngluarVelocity(controller.thrust*-0.1);
  s.chassis.thrust(controller.thrust);

  // line4.x1 = s.chassis.x;
  // line4.y1 = s.chassis.y;
  // line4.x2 = s.chassis.x + Math.cos(angleOfMovement)*70;
  // line4.y2 = s.chassis.y + Math.sin(angleOfMovement)*70;
  //
  // let dif = angleOfMovement - angle;
  // while (dif < -Math.PI){
  //   dif += 2* Math.PI;
  // }
  // while (dif > Math.PI){
  //   dif -= 2* Math.PI;
  // }
  //
  // line5.x1 = s.chassis.x;
  // line5.y1 = s.chassis.y;
  // line5.x2 = s.chassis.x + Math.cos(dif)*70;
  // line5.y2 = s.chassis.y + Math.sin(dif)*70;

}
const compensationCollectionLast = (s) => {
  s.target = s.findClosestIn(rocks);
  let angleToTarget = s.angleBetweenClamped(s.target);
  let angle = Phaser.Math.Angle.Between(s.chassis.x, s.chassis.y, s.target.x, s.target.y);
  let angleOfMovement = Phaser.Math.Angle.Between(s.chassis.x, s.chassis.y, s.chassis.x+s.chassis.body.velocity.x, s.chassis.y+s.chassis.body.velocity.y);

  let dif = angleOfMovement - angle;
  while (dif < -Math.PI){
    dif += 2* Math.PI;
  }
  while (dif > Math.PI){
    dif -= 2* Math.PI;
  }

  let sig = (3/(1+Math.pow(Math.E, -dif)) - 1.5)
  angleToTarget += (Math.PI/4) * sig;

  let sum = 0;
  let counter = s.chassis.body.angularVelocity;
  while (counter > 0.01){
    sum += counter;
    counter -=0.01;
  }
  while (counter < -0.01){
    sum += counter;
    counter +=0.01;
  }


  if (Math.abs(sum) < Math.abs(angleToTarget)){
    if (angleToTarget < 0)
      s.addAngluarVelocity(controller.thrust*0.1);
    else if(angleToTarget > 0)
      s.addAngluarVelocity(controller.thrust*-0.1);
  }
  else{
    if (sum > 0)
      s.addAngluarVelocity(controller.thrust*-0.1);
    else if(sum < 0)
      s.addAngluarVelocity(controller.thrust*0.1);
  }
  s.chassis.thrust(controller.thrust);

  // line.x1 = s.chassis.x;
  // line.y1 = s.chassis.y;
  // line.x2 = s.chassis.x + Math.cos(angleToTarget + angle)*70;
  // line.y2 = s.chassis.y + Math.sin(angleToTarget + angle)*70;
  //
  // graphics.lineStyle(5, 0xffffff);
  // graphics.strokeLineShape(line);
  //
  // let dif = angleOfMovement - angle;
  // while (dif < -Math.PI){
  //   dif += 2* Math.PI;
  // }
  // while (dif > Math.PI){
  //   dif -= 2* Math.PI;
  // }
  //
  // line5.x1 = s.chassis.x;
  // line5.y1 = s.chassis.y;
  // line5.x2 = s.chassis.x + Math.cos(angleToTarget)*70;
  // line5.y2 = s.chassis.y + Math.sin(angleToTarget)*70;

}
