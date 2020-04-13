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
}

const settings = {
  ships: 100,  // These number variables will cause a GUI slider element to be shown
  rocks: 40,
  shipFriction: 0.01,
  thrust: 0.1,
  "Apply": function(){
    controller.sync();

    //add or remove ships
    while(ships.length < settings.ships){
      addShip();
      shipCollisionDetection();
    }
    while(ships.length > settings.ships){
      ships.pop().destroy();
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
      s.body.frictionAir = controller.shipFriction;
    });
  },
  "Reset": function(){
    scene.scene.restart();
  }
}

const controller = {
  ships: 100,
  rocks: 40,
  shipFriction: 0.01,
  thrust: 0.1,

  sync: () => {
    controller.ships = settings.ships;
    controller.rocks = settings.rocks;
    controller.shipFriction = settings.shipFriction;
    controller.thrust = settings.thrust;
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

let ship, line, line2, rock, angle;
let shipShape = '0 0 20 10 0 20 5 10';
let octaRock = '20 10 17.071 17.071 10 20 2.929 17.071 0 10 2.929 2.929 10 0 17.071 2.929'

let ships = [];
let rocks = [];
let lines = [];

let unsubscribe = ()=>{};

function preload ()
{
}

function create ()
{
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

  shipCollisionDetection();
}


function update ()
{
  _.each(ships, function(s) {
    let target;
    let shortDistance = 999999;
    _.each(rocks, function(r){
      let distance = Phaser.Math.Distance.Between(s.body.position.x, s.body.position.y, r.body.position.x, r.body.position.y);
      // console.log(distance);
      if ( distance < shortDistance){
        target = r;
        shortDistance = distance;
      }
    });


    angle = Phaser.Math.Angle.Between(s.x, s.y, target.x, target.y);
    let dif = s.rotation - angle;
    while (dif < -Math.PI){
      dif += 2* Math.PI;
    }
    while (dif > Math.PI){
      dif -= 2* Math.PI;
    }
    if (dif<0)
      s.setAngularVelocity(s.body.angularVelocity + controller.thrust*0.1);
    if (dif>0)
      s.setAngularVelocity(s.body.angularVelocity- controller.thrust*0.1);
    s.thrust(controller.thrust);
  })
}

let addShip = () => {
  construction = scene.add.polygon(Math.random()*sceneWidth, Math.random()*sceneHeight, shipShape);
  construction.isStroked = true;
  scene.matter.add.gameObject(construction, { shape: { type: 'fromVerts', verts: shipShape, flagInternal: true } });
  construction.setMass(500).setRotation( Math.random()*2*Math.PI - Math.PI );
  construction.body.frictionAir = controller.shipFriction;
  ships.push(construction);
}

let shipCollisionDetection = () => {
  unsubscribe();
  unsubscribe = scene.matterCollision.addOnCollideStart({
    objectA: ships,
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
