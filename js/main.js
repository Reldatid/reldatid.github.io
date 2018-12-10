function setup(){
  createCanvas(windowWidth, windowHeight);
  background(0);
  noFill();
  noStroke();
  colorMode(HSB, 255);
};

function draw(){
  let i = 0;
  while ( i < 10 ){
    const x = random(windowWidth);
    const y = random(windowHeight);
    const size = 75;
    const hue = map(x, 0, windowWidth, 0, 255);
    const saturation = map(y, 0, windowHeight, 0, 255);
    const brightness = map(x+y, 0, windowWidth+windowHeight, 0, 255);

    fill( hue , saturation , brightness, 10)
    ellipse(x, y, size, size);
    i++
  }
};
