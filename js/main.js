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

var game = new Phaser.Game(config);
let scene;
const sceneWidth = game.config.width*2;
const sceneHeight = game.config.height*2;

const centerX = sceneWidth/2;
const centerY = sceneHeight/2;
let cursors;
let graphics;

let ship, line, line2, rock, angle;
let ships = [];
let rocks = [];
let lines = [];

function preload ()
{
  scene = game.scene.scenes[0];
  graphics = this.add.graphics();
  graphics.lineStyle(2, 0xffff00);
}

function create ()
{
  game.scene.scenes[0].cameras.main.zoom = 0.5;
  game.scene.scenes[0].cameras.main.useBounds = true;
  cursors = this.input.keyboard.createCursorKeys();
  let shipShape = '0 0 20 10 0 20 5 10';2.929
  let octaRock = '20 10 17.071 17.071 10 20 2.929 17.071 0 10 2.929 2.929 10 0 17.071 2.929'

  this.matter.world.setBounds(0, 0, sceneWidth, sceneHeight);

  for(x = 0; x < 100; x ++){
    construction = this.add.polygon(x*20+100, 100, shipShape);
    construction.isStroked = true;
    this.matter.add.gameObject(construction, { shape: { type: 'fromVerts', verts: shipShape, flagInternal: true } });
    construction.setMass(500);
    ships.push(construction);
  }

  for(x = 0; x < 40; x ++){
    rock = this.add.polygon(Math.random()*sceneWidth, Math.random()*sceneHeight, octaRock);
    rock.isStroked = true;
    this.matter.add.gameObject(rock, { shape: { type: 'fromVerts', verts: octaRock, flagInternal: true } }).setSensor(true);
    rock.setMass(300);
    rock.entityType = 'Rock';
    rocks.push(rock);
  }



  // dot = this.add.circle(centerX, centerY, 30);
  // dot.isStroked = true;
  // this.matter.add.gameObject(dot, { shape: { type: 'circle' } });

  line = new Phaser.Geom.Line( centerX, 0, centerX, this.game.config.height);
  line2 = new Phaser.Geom.Line( 0, centerY, this.game.config.width, centerY);

  this.matterCollision.addOnCollideStart({
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
      s.setAngularVelocity(s.body.angularVelocity + 0.01);
    if (dif>0)
      s.setAngularVelocity(s.body.angularVelocity - 0.01);
    s.thrust(0.1);
  })

  // rockAngle = Phaser.Math.Angle.Between(rock.x, rock.y, centerX, centerY);
  // forceX = 10*Math.pow((centerX - rock.x)/300, 3);
  // forceY = 10*Math.pow((centerY - rock.y)/300, 3);
  // rock.applyForce({x:forceX, y:forceY})
}
