class Cave {

    radiuses: number[];
    dys: number[];
    xCoords: number[];
    canvasHeight: number;
    canvasWidth: number;
    minRadius: number;
    radiusVariation: number;
    dyVariation: number;
    xSpacing: number;
    pixelOffsetPerMillisecond: number;

    constructor(
        radiuses: number[], 
        dys: number[], 
        xCoords: number[], 
        canvasHeight: number, 
        canvasWidth: number, 
        minRadius: number,
        radiusVariation: number,
        dyVariation: number,
        xSpacing: number,
        pixelOffsetPerMillisecond: number
    ) {
        if (!(radiuses.length === dys.length && dys.length === xCoords.length)) {
            throw new Error("Coordinates differ in length");
        }
        if (radiuses.length === 0) {
            throw new Error("Coordinates have zero length");
        }

        for (let i = 0; i < radiuses.length; i++) {
            const r = radiuses[i];
            const dy = dys[i];
            if (!this.yCoordValid(r, dy, canvasHeight)) {
                throw new Error("Incorrect radiuses or dys");
            }
        }
        
        this.radiuses = radiuses;
        this.dys = dys;
        this.xCoords = xCoords;
        this.canvasHeight = canvasHeight;
        this.canvasWidth = canvasWidth;
        this.minRadius = minRadius;
        this.radiusVariation = radiusVariation;
        this.dyVariation = dyVariation;
        this.xSpacing = xSpacing;
        this.pixelOffsetPerMillisecond = pixelOffsetPerMillisecond;
    }

    coordUpdateRequired(): boolean {
        if (this.xCoords.length < 2) {
            return false;
        }
        return (this.xCoords[1] < 0);
    }

    yCoordValid(r: number, dy: number, h: number): boolean {
        return Math.abs(dy) + r <= h / 2;
    }
    
    newRadius(): number {
        return this.minRadius + Math.floor(Math.random() * this.radiusVariation);
    }
    
    newDY(): number {
        const previous = this.dys[this.dys.length - 1];
        const shift = Math.floor(Math.random() * this.dyVariation) - this.dyVariation / 2;
        return previous + shift;
    }

    newX(): number {
        return this.xCoords[this.xCoords.length - 1] + this.xSpacing;
    }

    updateCoords(): void {
        
        if (!this.coordUpdateRequired()) return;

        let r, dy;
        do {
            r = this.newRadius();
            dy = this.newDY();
        } while(!this.yCoordValid(r, dy, this.canvasHeight))

        this.radiuses.shift();
        this.radiuses.push(r);
        
        this.dys.shift();
        this.dys.push(dy);
        
        this.xCoords.shift();
        this.xCoords.push(this.newX());
    }

    scroll(elapsedTime: number): void {
        for (let i = 0; i < this.xCoords.length; i++) {
            this.xCoords[i] -= this.pixelOffsetPerMillisecond * elapsedTime;
        }
    }

    getCeilingY(r: number, dy: number): number {
        return this.canvasHeight / 2 - r - dy;
    }

    getFloorY(r: number, dy: number): number {
        return this.canvasHeight / 2 + r - dy;
    }

    yLinearInterpolation(x: number, x0: number, x1: number, y0: number, y1: number): number {
        return (y0*(x1 - x) + y1*(x - x0)) / (x1 - x0);
    }

    checkCollision(x: number, y: number): boolean {

        // Find x range
        let xIndex = 0;
        for (let i = 0; i < this.xCoords.length; i++) {
            if (this.xCoords[i] > x) {
                xIndex = i - 1;
                break;
            }
        }

        // Get points to be interpolated
        const x0 = this.xCoords[xIndex];
        const x1 = this.xCoords[xIndex + 1];
        const r0 = this.radiuses[xIndex];
        const r1 = this.radiuses[xIndex + 1];
        const dy0 = this.dys[xIndex];
        const dy1 = this.dys[xIndex + 1];
        const y0c = this.getCeilingY(r0, dy0);
        const y1c = this.getCeilingY(r1, dy1);
        const y0f = this.getFloorY(r0, dy0);
        const y1f = this.getFloorY(r1, dy1);

        // Check ceiling
        const yInterpolatedCeiling = this.yLinearInterpolation(x, x0, x1, y0c, y1c);
        if (y <= yInterpolatedCeiling) {
            return true;
        }

        // Check floor
        const yInterpolatedFloor = this.yLinearInterpolation(x, x0, x1, y0f, y1f);
        if (y >= yInterpolatedFloor) {
            return true;
        }

        return false;
    }

    getYoffsets(n: number, a: number, b: number = 2, maxValue: number = 750) {
        const offsets = [];
        for (let i = 0; i < n; i++) {
            let x = a * Math.pow(i, b);
            x = x > maxValue ? maxValue : x;
            offsets.push(x);
        }
        return offsets;
    }

    drawShape(shape: "ceiling" | "floor", canvas: HTMLCanvasElement, color: string, yOffset: number = 0) {
        
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = color;

        const yMax = shape === "ceiling" ? 0 : canvas.height;

        ctx.beginPath();
        ctx.moveTo(0, yMax);
        for (let i = 0; i < this.xCoords.length; i++) {
            const r = this.radiuses[i];
            const dy = this.dys[i];
            const x = this.xCoords[i];
            let y;
            if (shape === "ceiling") {
                y = this.getCeilingY(r, dy) - yOffset;
            } else {
                y = this.getFloorY(r, dy) + yOffset;
            }
            ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, yMax);
        ctx.fill();
    }

    draw(canvas: HTMLCanvasElement): void {

        const hue = 191;
        const saturation = 100;
        const lightnesses = [39, 37, 34, 30, 27, 25, 22, 20];
        const yOffsets = this.getYoffsets(8, 4, 2);

        for (let i = 0; i < lightnesses.length; i++) {
            const lightness = lightnesses[i];
            const yOffset = yOffsets[i];
            const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            this.drawShape("ceiling", canvas, color, yOffset);
            this.drawShape("floor", canvas, color, yOffset);
        }
    }

}

class Copter {

    x: number;
    y: number;
    maxY: number;
    ySpeed: number;
    maxYSpeed: number;
    g: number;
    thrust: number;
    distance: number;
    giveThrust: boolean;
    dead: boolean;
    pixelOffsetPerMillisecond: number;
    collisionOffsets: number[][];
    trail: CopterTrail;
    elapsedTimeScaling: number;
    hitPoint: number[];
    isHuman: boolean;
    
    constructor(
        x: number, 
        y: number, 
        maxY: number, 
        ySpeed: number, 
        maxYSpeed: number, 
        g: number, 
        thrust: number, 
        pixelOffsetPerMillisecond: number,
        collisionOffsets: number[][],
        trail: CopterTrail
    ) {
        this.x = x;
        this.y = y;
        this.maxY = maxY;
        this.ySpeed = ySpeed;
        this.maxYSpeed = maxYSpeed;
        this.g = g;
        this.thrust = thrust;
        this.distance = 0;
        this.giveThrust = false;
        this.dead = false;
        this.trail = trail;
        this.pixelOffsetPerMillisecond = pixelOffsetPerMillisecond;
        this.collisionOffsets = collisionOffsets;
        this.elapsedTimeScaling = 15;
        this.hitPoint = [];
        this.isHuman = false;
    }

    addPlayerControls(): void {
        this.isHuman = true;
        document.addEventListener("keydown",   () => { this.thrustOn()  });
        document.addEventListener("keyup",     () => { this.thrustOff() });
        document.addEventListener("mousedown", () => { this.thrustOn()  });
        document.addEventListener("mouseup",   () => { this.thrustOff() });
    }

    thrustOn(): void {
        this.giveThrust = true;
    }

    thrustOff(): void {
        this.giveThrust = false;
    }

    updateSpeed(elapsedTime: number): void {
        const multiplier = elapsedTime / this.elapsedTimeScaling;
        this.ySpeed += this.g * multiplier;
        if (this.giveThrust) {
            this.ySpeed -= this.thrust * multiplier;
        }
        if (this.ySpeed > this.maxYSpeed) this.ySpeed = this.maxYSpeed;
        else if (this.ySpeed < -this.maxYSpeed) this.ySpeed = -this.maxYSpeed;
    }

    updatePosition(elapsedTime: number): void {
        this.y += this.ySpeed * (elapsedTime / this.elapsedTimeScaling);
        if (this.y > this.maxY) this.y = this.maxY;
        else if (this.y < 0) this.y = 0;
    }

    updateDistance(elapsedTime: number): void {
        this.distance += elapsedTime * 0.02;
    }

    updateTrail(elapsedTime: number): void {
        this.trail.update(this.x, this.y, elapsedTime);
    }

    scrollWithBackGround(elapsedTime: number): void {
        this.x -= this.pixelOffsetPerMillisecond * elapsedTime;
        this.hitPoint[0] -= this.pixelOffsetPerMillisecond * elapsedTime;
    }

    update(elapsedTime: number, hit: boolean, hitPoint: number[]): void {

        if (hit || this.dead) {
            this.dead = true;
            if (hitPoint.length > 0) this.hitPoint = hitPoint;
            this.scrollWithBackGround(elapsedTime);
            return;
        }

        this.updateSpeed(elapsedTime);
        this.updatePosition(elapsedTime);
        this.updateDistance(elapsedTime);
        this.updateTrail(elapsedTime);
    }

    drawCopterImage(canvas: HTMLCanvasElement): void {
        const imgElem = document.querySelector("img")!;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(imgElem, this.x - 65, this.y - 28);
    }

    draw(canvas: HTMLCanvasElement, i: number): void {

        this.trail.draw(canvas, this.dead);
        this.drawCopterImage(canvas);
        drawDistanceText(canvas, this.distance, i);

        if (this.dead) {
            const [x, y] = this.hitPoint;
            drawCircle(canvas, x, y, "red");
        } 
    }
}

class CopterTrail {

    positionBuffer: number[][];
    maxLength: number;
    interval: number;
    pixelOffsetPerMillisecond: number;
    
    constructor(maxLength: number, interval: number, pixelOffsetPerMillisecond: number) {
        this.positionBuffer = [];
        this.maxLength = maxLength;
        this.interval = interval;
        this.pixelOffsetPerMillisecond = pixelOffsetPerMillisecond;
    }

    update(x: number, y: number, elapsedTime: number): void {

        if (elapsedTime < this.interval) return;

        // Only store maxLength amount of values
        if (this.positionBuffer.length === this.maxLength) {
            this.positionBuffer.shift();
        }

        // x values need to be scrolled along with the cave
        for (let i = 0; i < this.positionBuffer.length; i++) {
            this.positionBuffer[i][0] -= this.pixelOffsetPerMillisecond * elapsedTime;
        }

        // Store new value (with offsets)
        const offsetX = x - 40;
        const offsetY = y - 5;
        this.positionBuffer.push([offsetX, offsetY]);
    }

    draw(canvas: HTMLCanvasElement, copterDead: boolean): void {

        if (copterDead) return;

        const iMax = this.positionBuffer.length - 1;
        const iMin = 0;
        
        for (let i = iMax; i >= iMin; i--) {
            const [x, y] = this.positionBuffer[i];
            const alpha = 0.6 * (i / (iMax - iMin));
            const color = "rgba(255, 136, 0," + alpha + ")";
            const radius = 7 * (i / (iMax - iMin));
            drawCircle(canvas, x, y, color, radius);
        }
    }
}

class GameParameters {

    numCopters: number;
    hasHumanPlayer: boolean;
    canvas: HTMLCanvasElement;
    pixelOffsetPerMillisecond: number;
    
    caveMinRadius: number;
    caveRadiusVariation: number;
    caveDyVariation: number;
    caveXSpacing: number;
    initialRadiuses: number[];
    initialDYs: number[];
    initialXs: number[];
    
    gravity: number;
    copterX: number;
    copterStartY: number;
    copterMaxY: number;
    copterStartYSpeed: number;
    copterMaxYSpeed: number;
    copterCollisionOffsets: number[][];
    copterThrust: number;
    copterTrailLength: number;
    copterTrailInterval: number;
    
    constructor(
        numCopters: number = 1, 
        hasHumanPlayer: boolean = true,
        canvas: HTMLCanvasElement = document.querySelector("canvas")!,
        pixelOffsetPerMillisecond: number = 0.5, 
        
        caveMinRadius: number = 200,  // 70
        caveRadiusVariation: number = 80,
        caveDyVariation: number = 160,
        caveXSpacing: number = 100,
        initialRadiuses: number[] = [100, 200, 300, 350, 250, 270, 220, 200, 300, 240, 150, 250, 50, 120, 100, 60], 
        initialDYs: number[] = [0, 50, -50, 10, 20, 100, 40, 0, 50, -50, 10, 20, 100, 40, 60, 120], 
        initialXs: number[] = [-100, 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400], 
        
        gravity: number = 0.3, 
        copterX: number = 500, 
        copterStartY: number = 300, 
        copterStartYSpeed: number = 0,
        copterMaxYSpeed: number = 5,
        copterCollisionOffsets: number[][] = [[-1, -4], [0, -30], [-52, -30], [-63, -23], [-44, -3]],
        copterThrust: number = 1.6, 
        copterTrailLength: number = 11, 
        copterTrailInterval: number = 10
    ) 
    {
        this.numCopters = numCopters;
        this.hasHumanPlayer = hasHumanPlayer;
        this.canvas = canvas;
        this.pixelOffsetPerMillisecond = pixelOffsetPerMillisecond;
        
        this.caveMinRadius = caveMinRadius;
        this.caveRadiusVariation = caveRadiusVariation;
        this.caveDyVariation = caveDyVariation;
        this.caveXSpacing = caveXSpacing;
        this.initialRadiuses = initialRadiuses;
        this.initialDYs = initialDYs;
        this.initialXs = initialXs;
        
        this.gravity = gravity;
        this.copterX = copterX;
        this.copterStartY = copterStartY;
        this.copterMaxY = canvas.height;
        this.copterStartYSpeed = copterStartYSpeed;
        this.copterMaxYSpeed = copterMaxYSpeed;
        this.copterCollisionOffsets = copterCollisionOffsets;
        this.copterThrust = copterThrust;
        this.copterTrailLength = copterTrailLength;
        this.copterTrailInterval = copterTrailInterval;
    }
}

interface AIStrategy {

    encodeInputData(
        rs: number[],
        dys: number[],
        xs: number[],
        copterX: number,
        copterY: number,
        copterYSpeed: number
    ): number[];

    decision(encodedInput: number[]): boolean;
}

class RandomAI implements AIStrategy {
    
    encodeInputData(
        rs: number[],
        dys: number[],
        xs: number[],
        copterX: number,
        copterY: number,
        copterYSpeed: number
    ): number[] 
    {
        return [];
    }

    decision(encodedInput: number[]): boolean {
        return Math.random() < 0.2;
    }
}

class Game {

    parameters: GameParameters;
    cave: Cave;
    copters: Copter[];
    gameOver: boolean;
    previousTimestamp: number;
    strategy: AIStrategy;

    constructor(parameters: GameParameters) {

        this.parameters = parameters;
        this.gameOver = false;
        this.previousTimestamp = 0;
        this.strategy = new RandomAI();

        this.cave = new Cave(
            parameters.initialRadiuses,
            parameters.initialDYs,
            parameters.initialXs,
            parameters.canvas.height,
            parameters.canvas.width,
            parameters.caveMinRadius,
            parameters.caveRadiusVariation,
            parameters.caveDyVariation,
            parameters.caveXSpacing,
            parameters.pixelOffsetPerMillisecond
        );

        this.copters = [];

        for (let i = 0; i < parameters.numCopters; i++) {
            const copter = new Copter(
                parameters.copterX,
                parameters.copterStartY,
                parameters.copterMaxY,
                parameters.copterStartYSpeed,
                parameters.copterMaxYSpeed,
                parameters.gravity,
                parameters.copterThrust,
                parameters.pixelOffsetPerMillisecond,
                parameters.copterCollisionOffsets,
                new CopterTrail(
                    parameters.copterTrailLength, 
                    parameters.copterTrailInterval, 
                    parameters.pixelOffsetPerMillisecond
                )
            );
            if (i === 0 && parameters.hasHumanPlayer) {
                copter.addPlayerControls();
            }
            this.copters.push(copter);
        }
    }

    checkCollision(copter: Copter): number[] {
        for (let i = 0; i < copter.collisionOffsets.length; i++) {
            const [dx, dy] = copter.collisionOffsets[i];
            const hit = this.cave.checkCollision(copter.x + dx, copter.y + dy);
            if (hit) {
                return [copter.x + dx, copter.y + dy];
            }
        }
        return [];
    }
    
    caveStep(elapsedTime: number): void {
        this.cave.updateCoords();
        this.cave.scroll(elapsedTime);
        this.cave.draw(this.parameters.canvas);
    }

    copterStep(elapsedTime: number): void {
        for (let i = 0; i < this.copters.length; i++) {
            const copter = this.copters[i];
            const hitPoint = this.checkCollision(copter);
            const hit = hitPoint.length > 0;
            copter.update(elapsedTime, hit, hitPoint);
            copter.draw(this.parameters.canvas, i);
        }
    }

    AIStep(): void {

        this.copters.forEach(copter => {
            if (copter.dead || copter.isHuman) return;

            const encodedInput = this.strategy.encodeInputData(
                this.cave.radiuses,
                this.cave.dys,
                this.cave.xCoords,
                copter.x,
                copter.y,
                copter.ySpeed
            );

            const decision = this.strategy.decision(encodedInput);
            if (decision) 
                copter.thrustOn();
            else
                copter.thrustOff();
        });
    }

    step(elapsedTime: number): void {
        clearCanvas(this.parameters.canvas);
        this.AIStep();
        this.caveStep(elapsedTime);
        this.copterStep(elapsedTime);
        this.gameOver = this.copters.every(copter => copter.dead);
    }
}

function drawCircle(canvas: HTMLCanvasElement, x: number, y: number, color: string, radius: number = 5): void {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2*Math.PI);
    ctx.fill();
}

function clearCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, "hsl(199, 100%, 50%)");
    gradient.addColorStop(0.5, "hsl(199, 100%, 90%)");
    gradient.addColorStop(1, "hsl(285, 100%, 80%)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawDistanceText(canvas: HTMLCanvasElement, distance: number, i: number): void {
    const text = "Distance: " + Math.floor(distance);
    const y = 30 + 25*i;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.fillText(text, 30, y);
    ctx.strokeText(text, 30, y);
}

function onDocumentReady(callback: () => void): void {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(callback, 1);
    } else {
        document.addEventListener("DOMContentLoaded", callback);
    }
} 


function main(): void {

    // -- Initialization -- //

    // Single player
    const parameters = new GameParameters();
    parameters.caveMinRadius = 70;
    
    // AI
    // const parameters = new GameParameters(50, false);

    const game = new Game(parameters);
    

    // -- Game loop -- //

    function step(timestamp: number) {
        if (game.previousTimestamp === 0) { 
            game.previousTimestamp = timestamp; 
        }
        
        const elapsedTime = timestamp - game.previousTimestamp;
        game.previousTimestamp = timestamp;

        game.step(elapsedTime);
        if (game.gameOver) return; 

        window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);

}


onDocumentReady(main);


// TODO copter max speed params
// TODO copter image size params for collision
// TODO difficulty params

// AI Notes
// rs, dys, xs: index 6-> relevant
// normalize encoded input!
// neural net weight initiailzation
