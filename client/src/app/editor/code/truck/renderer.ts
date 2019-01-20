import { World, TileOpening, WorldState, Tile, Truck, TurnDirection, Direction } from '../../../shared/syntaxtree/truck/world';

/**
 * Renderer.
 */
export class Renderer {
  /** True until the animation is stopped. */
  private running: boolean;

  /** Renderer for the world to be drawn. */
  private worldRenderer: WorldRenderer;

  /** Rendering context. */
  private ctx: RenderingContext;

  /**
   * Initializes the renderer.
   * @param world World to be drawn.
   * @param ctx Canvas 2d context.
   * @param width Width of the canvas.
   * @param height Height of the canvas.
   */
  constructor(world: World, ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.running = true;
    this.ctx = new RenderingContext(ctx, width, height, world);

    this.worldRenderer = new WorldRenderer(this.ctx.world, this);
  }

  /**
   * Stops the animation.
   */
  stop() {
    this.running = false;
  }

  /**
   * Draws until the animation is stopped.
   * @param timestamp Timestamp.
   */
  render(timestamp: DOMHighResTimeStamp = null) {
    if (!this.running) { return; }

    // Set timestamp
    this.ctx.timestamp(timestamp);

    // Clear canvas
    this.ctx.ctx.fillStyle = '#FFFFFF';
    this.ctx.ctx.fillRect(0, 0, this.ctx.width, this.ctx.height);

    // Draw world
    this.worldRenderer.draw(this.ctx);

    // Again
    requestAnimationFrame((ts: DOMHighResTimeStamp) => this.render(ts));
  }
}

/**
 * Rendering context.
 */
class RenderingContext {
  /** Canvas 2d context. */
  readonly ctx: CanvasRenderingContext2D;

  /** Width of the canvas. */
  readonly width: number;

  /** Height of the canvas. */
  readonly height: number;

  /** World. */
  readonly world: World;

  /** Timestamp of the start of the animation. */
  start: DOMHighResTimeStamp;

  /** Timestamp of the previous frame. */
  previousFrame: DOMHighResTimeStamp;

  /** Timestamp of the current frame. */
  currentFrame: DOMHighResTimeStamp;

  /**
   * Initializes the rendering context.
   * @param ctx Canvas 2d context.
   * @param width Width of the canvas.
   * @param height Height of the canvas.
   * @param world World.
   */
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number, world: World) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.world = world;

    this.start = 0;
    this.previousFrame = 0;
    this.currentFrame = 0;
  }

  /**
   * Duration of a step in milliseconds.
   * @return Duration in milliseconds.
   */
  get animationSpeed(): number {
    return this.world.animationSpeed;
  }

  /**
   * Rotates the canvas by the passed number of degrees around the passed point,
   * executes the function and resets the context.
   * @param x Point to be rotated.
   * @param y Point to be rotated.
   * @param angle Degree to be rotated.
   * @param f Function.
   */
  rotate(x: number, y: number, angle: number, f: () => void) {
    // Cache context
    this.ctx.save();

    // Move origin
    this.ctx.translate(x, y);

    // Turn
    this.ctx.rotate(angle * Math.PI / 180);

    // Draw
    f();

    // Reset context
    this.ctx.restore();
  }

  /**
   * Sets the canvas's alpha value to the passed value, executes the function,
   * and resets the alpha value.
   * @param alpha alpha value.
   * @param f Function.
   */
  alpha(alpha: number, f: () => void) {
    const tempAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = alpha;
    f();
    this.ctx.globalAlpha = tempAlpha;
  }

  /**
   * Updates the timestamp.
   * @param ts timestamp.
   */
  timestamp(ts: DOMHighResTimeStamp = null) {
    if (ts == null) {
      ts = performance.now();
      this.start = ts;
      this.previousFrame = ts;
      this.currentFrame = ts;
    } else {
      this.previousFrame = this.currentFrame;
      this.currentFrame = ts;
    }
  }

  /**
   * Returns the time since the start of the animation.
   * @return Time since the start of the animation.
   */
  get timeSinceStart(): DOMHighResTimeStamp {
    return this.currentFrame - this.start;
  }
}

/**
 * Interface for an ObjectRenderer.
 */
interface ObjectRenderer {
  /**
   * Draws the object in the given context.
   * @param ctx RenderingContext.
   */
  draw(ctx: RenderingContext): void;
}

/**
 * ObjectRenderer für eine Welt.
 */
class WorldRenderer implements ObjectRenderer {
  /** World to be drawn. */
  world: World;

  /** Parent Renderer. */
  parent: Renderer;

  /** WorldStateRenderer. */
  stateRenderer: WorldStateRenderer;

  /**
   * Initializes the WorldRenderer.
   * @param world World to be drawn.
   * @param parent Parent Renderer.
   */
  constructor(world: World, parent: Renderer) {
    this.world = world;
    this.parent = parent;

    this.stateRenderer = new WorldStateRenderer(this.world.state, this);
  }

  /**
   * Draws the world in the given context.
   * @param ctx RenderingContext.
   */
  draw(ctx: RenderingContext) {
    // Update WorldStateRenderer when state changed
    if (this.stateRenderer.state.step > this.world.state.step) {
      // Don't animate undo
      this.stateRenderer.update(this.world.state, true);
    } else {
      while (this.stateRenderer.state.step < this.world.state.step) {
        this.stateRenderer.update(this.world.getState(this.stateRenderer.state.step + 1));
      }
    }
    this.stateRenderer.draw(ctx);
  }
}

/**
 * ObjectRenderer for a world state.
 */
class WorldStateRenderer implements ObjectRenderer {
  /** World state to be drawn. */
  state: WorldState;

  /** Parent WorldRenderer. */
  parent: WorldRenderer;

  /** TruckRender. */
  truckRenderer: TruckRenderer;

  /** Initialized TileRenderer for the state. */
  tileRenderers: Array<TileRenderer>;

  /**
   * Initializes the WorldStateRenderer.
   * @param state World state to be drawn.
   * @param parent Parent WorldRenderer.
   */
  constructor(state: WorldState, parent: WorldRenderer) {
    this.state = state;
    this.parent = parent;

    // Preload TileRenderer
    this.tileRenderers = this.state.tiles.map((t) => new TileRenderer(t, this));

    // Preload TruckRenderer
    this.truckRenderer = new TruckRenderer(this.state.truck, this);
  }

  /**
   * Draws the world state in the passed context.
   * @param ctx RenderingContext.
   */
  draw(ctx: RenderingContext) {
    this.tileRenderers.forEach((t) => t.draw(ctx));
    this.truckRenderer.draw(ctx);
  }

  /**
   * Update state.
   * @param state New state.
   */
  update(state: WorldState, undo: boolean = false) {
    this.state = state;

    this.tileRenderers.forEach((t, k) => t.update(state.tiles[k], undo));
    this.truckRenderer.update(state.truck, undo);
  }
}

/**
 * ObjectRenderer for a tile.
 */
class TileRenderer implements ObjectRenderer {
  /** Tile to be drawn. */
  tile: Tile;

  /** Parent WorldStateRenderer. */
  parent: WorldStateRenderer;

  /** Sprite for the tile background. */
  tileSprite: Sprite;

  /** Sprite for the traffic lights. */
  trafficLightSprite: Sprite;

  /** Sprite for freight. */
  freightSprite: Sprite;

  /** Start timestamp of the animation. */
  startAnimation: DOMHighResTimeStamp;

  /** Overlap of the tile to avoid ugly edges. */
  overlap = 1;

  /**
   * Initializes the TileRenderer.
   * @param tile Tile to be drawn.
   * @param parent Parent WorldStateRenderer.
   */
  constructor(tile: Tile, parent: WorldStateRenderer) {
    this.tile = tile;
    this.parent = parent;

    // Preload Sprites
    this.tileSprite = SpriteFactory.getSprite('/vendor/truck/tiles.svg', 64, 64);
    this.trafficLightSprite = SpriteFactory.getSprite('/vendor/truck/trafficLight.svg', 10, 10);
    this.freightSprite = SpriteFactory.getSprite('/vendor/truck/freight.svg', 10, 10);
  }

  /**
   * Draws the tile in the given context.
   * @param ctx RenderingContext.
   */
  draw(ctx: RenderingContext) {
    // Calculate the height and width of the tile
    const tileWidth = ctx.width / this.tile.position.width;
    const tileHeight = ctx.height / this.tile.position.height;

    if (this.startAnimation === null) { this.startAnimation = ctx.currentFrame; }
    const t = (ctx.currentFrame - this.startAnimation) / (this.parent.state.time * ctx.animationSpeed);

    this.tileSprite.draw(
      ctx, this.tileSpriteNumber,
      tileWidth * this.tile.position.x - this.overlap,
      tileWidth * this.tile.position.y - this.overlap,
      tileWidth + this.overlap * 2,
      tileHeight + this.overlap * 2
    );

    // Draw traffic lights
    this.tile.trafficLights.forEach((tl, i) => {
      if (tl != null) {
        // Switch traffic light on half of the step
        const isGreen = tl.isGreen(Math.max(0, t < 0.5 ? this.parent.state.timeStep - 1 : this.parent.state.timeStep));
        this.trafficLightSprite.draw(
          ctx, i * 2 + (isGreen ? 1 : 0),
          tileWidth * this.tile.position.x - this.overlap,
          tileWidth * this.tile.position.y - this.overlap,
          tileWidth + this.overlap * 2,
          tileHeight + this.overlap * 2
        );
      }
    });

    // Draw freight
    if (this.tile.freightItems > 0) {
      this.freightSprite.draw(
        ctx, this.freightSpriteNumber,
        tileWidth * this.tile.position.x - this.overlap,
        tileWidth * this.tile.position.y - this.overlap,
        tileWidth + this.overlap * 2,
        tileHeight + this.overlap * 2
      );
    }

    // Draw targets
    if (this.tile.freightTarget != null) {
      this.freightSprite.draw(
        ctx, this.freightTargetSpriteNumber,
        tileWidth * this.tile.position.x - this.overlap,
        tileWidth * this.tile.position.y - this.overlap,
        tileWidth + this.overlap * 2,
        tileHeight + this.overlap * 2
      );
    }
  }

  /**
   * Update tile.
   * @param tile New tile.
   */
  update(tile: Tile, undo: boolean = false) {
    this.tile = tile;
    this.startAnimation = null;
  }

  /**
   * Returns the number of the tile in the sprite, depending on the requested
   * openings.
   * @return Number of the tile in the sprite.
   */
  private get tileSpriteNumber(): number {
    return {
      [TileOpening.None]: 0,
      [TileOpening.North]: 1,
      [TileOpening.East]: 2,
      [TileOpening.South]: 3,
      [TileOpening.West]: 4,

      [TileOpening.North | TileOpening.South]: 5,
      [TileOpening.East | TileOpening.West]: 6,

      [TileOpening.North | TileOpening.East]: 7,
      [TileOpening.East | TileOpening.South]: 8,
      [TileOpening.South | TileOpening.West]: 9,
      [TileOpening.North | TileOpening.West]: 10,

      [TileOpening.North | TileOpening.East | TileOpening.South]: 11,
      [TileOpening.East | TileOpening.South | TileOpening.West]: 12,
      [TileOpening.North | TileOpening.South | TileOpening.West]: 13,
      [TileOpening.North | TileOpening.East | TileOpening.West]: 14,

      [TileOpening.North | TileOpening.East | TileOpening.South | TileOpening.West]: 15,
    }[this.tile.openings];
  }

  /**
   * Returns the number of the tile in the sprite, depending on the requested
   * freight.
   * @return Number of the tile in the sprite.
   */
  private get freightSpriteNumber(): number {
    return {
      'red': 0,
      'green': 2,
      'blue': 4,
    }[this.tile.freightColor()];
  }

  /**
   * Returns the number of the tile in the sprite depending on the requested
   * target.
   * @return Number of the tile in the sprite.
   */
  private get freightTargetSpriteNumber(): number {
    return {
      'red': 1,
      'green': 3,
      'blue': 5,
    }[this.tile.freightColor()];
  }
}

/**
 * ObjectRenderer of a truck.
 */
class TruckRenderer implements ObjectRenderer {
  /** Duration of a turning signal interval in milliseconds. */
  readonly blinkerInterval = 700;

  /** Truck to be drawn. */
  truck: Truck;

  /** Parent WorldStateRenderer. */
  parent: WorldStateRenderer;

  /** Truck of the previous state. */
  prevTruck: Truck;

  /** Start timestamp of the animation. */
  startAnimation: DOMHighResTimeStamp;

  /** Sprite for the truck. */
  truckSprite: Sprite;

  /** Sprite for the blinker. */
  turnSignalSprite: Sprite;

  /**
   * Initializes the TruckRenderer.
   * @param truck Truck to be drawn.
   * @param parent Parent WorldStateRenderer.
   */
  constructor(truck: Truck, parent: WorldStateRenderer) {
    this.truck = truck;
    this.parent = parent;

    this.prevTruck = null;
    this.startAnimation = null;

    // Sprites vorladen
    this.truckSprite = SpriteFactory.getSprite('/vendor/truck/truck.svg', 10, 10);
    this.turnSignalSprite = SpriteFactory.getSprite('/vendor/truck/turnSignal.svg', 10, 10);
  }

  /**
   * Calculates the center of the truck.
   * @param tileWidth Width of a tile.
   * @param tileHeight Height of a tile.
   * @param truck Truck.
   */
  private calculateTruckPosition(tileWidth: number, tileHeight: number, truck: Truck) {
    let truckPositionX = tileWidth * truck.position.x + tileWidth / 2;
    let truckPositionY = tileHeight * truck.position.y + tileHeight / 2;

    if (truck.facingDirection === Direction.North) { truckPositionY += tileHeight / 2; }
    if (truck.facingDirection === Direction.East) { truckPositionX -= tileWidth / 2; }
    if (truck.facingDirection === Direction.South) { truckPositionY -= tileHeight / 2; }
    if (truck.facingDirection === Direction.West) { truckPositionX += tileWidth / 2; }

    return {
      x: truckPositionX,
      y: truckPositionY
    };
  }

  /**
   * Calculates the rotation angle of a truck.
   * @param truck Truck.
   */
  private calculateTruckAngle(truck: Truck) {
    return (truck.facing) * 90;
  }

  /**
   * Draws the truck in the given context.
   * @param ctx RenderingContext.
   */
  draw(ctx: RenderingContext) {
    // Calculate the height and width of the tile
    const tileWidth = ctx.width / this.truck.position.width;
    const tileHeight = ctx.height / this.truck.position.height;

    // Calculate the height and width of the truck
    const truckWidth = tileWidth / 3;
    const truckHeight = tileHeight / 3;

    // Calculate the position of the truck
    const truckPosition = this.calculateTruckPosition(tileWidth, tileHeight, this.truck);
    let truckAngle = this.calculateTruckAngle(this.truck);
    let turnSignalSpriteNumber = this.turnSignalSpriteNumber(this.truck);

    if (this.prevTruck) {
      if (this.startAnimation === null) { this.startAnimation = ctx.currentFrame; }

      const t = (ctx.currentFrame - this.startAnimation) / (this.parent.state.time * ctx.animationSpeed);

      // Interpolate if animation is not finished yet and truck has changed its
      // position between states
      if (t <= 1 && (this.truck.position !== this.prevTruck.position || this.truck.facing !== this.prevTruck.facing)) {
        // Calculate position of previous truck
        const prevTruckPosition = this.calculateTruckPosition(tileWidth, tileHeight, this.prevTruck);
        const prevTruckAngle = this.calculateTruckAngle(this.prevTruck);

        // Interpolate position
        truckPosition.x = prevTruckPosition.x + (truckPosition.x - prevTruckPosition.x) * t;
        truckPosition.y = prevTruckPosition.y + (truckPosition.y - prevTruckPosition.y) * t;
        truckAngle = prevTruckAngle + (truckAngle - prevTruckAngle) * t;

        // If necessary, leave the turn signal on as long as truck is turning
        if (this.prevTruck.turning !== TurnDirection.Straight) {
          turnSignalSpriteNumber = this.turnSignalSpriteNumber(this.prevTruck);
        }
      }
    }

    // Calculate the alpha value for the turn signal
    const turnSignalAlpha = ((t: DOMHighResTimeStamp) => {
      const tn = (t % this.blinkerInterval) / this.blinkerInterval;
      // min(1, max(0, cos(x * 2 * pi)+0.5)) with x from 0 to 1
      return Math.min(1, Math.max(0, Math.cos(tn * 2 * Math.PI) + 0.5));
    })(ctx.timeSinceStart);

    ctx.rotate(
      truckPosition.x, truckPosition.y,
      truckAngle,
      () => {
        ctx.alpha(
          turnSignalAlpha,
          () => {
            this.turnSignalSprite.draw(
              ctx, turnSignalSpriteNumber,
              -(truckWidth / 2),
              -(truckHeight / 2),
              truckWidth, truckHeight
            );
          }
        );
        this.truckSprite.draw(
          ctx, this.truckSpriteNumber,
          -(truckWidth / 2),
          -(truckHeight / 2),
          truckWidth, truckHeight
        );
      }
    );
  }

  /**
   * Update the truck.
   * @param truck New truck.
   */
  update(truck: Truck, undo: boolean = false) {
    this.prevTruck = undo ? null : this.truck;
    this.truck = truck;
    this.startAnimation = null;
  }

  /**
   * Returns the number of the tile in the sprite, depending on the freight.
   * @return Number of the tile in the sprite.
   */
  private get truckSpriteNumber(): number {
    if (this.truck.freightColor() == null) { return 0; }
    return {
      red: 1,
      green: 2,
      blue: 3,
    }[this.truck.freightColor()];
  }

  /**
   * Returns the number of the tile in the sprite, depending on the turn signal.
   * @param truck Truck for which the turn signal is to be determined.
   * @return Number of the tile in the sprite.
   */
  private turnSignalSpriteNumber(truck: Truck): number {
    return {
      [TurnDirection.Straight]: 0,
      [TurnDirection.Left]: 1,
      [TurnDirection.Right]: 2,
    }[truck.turning];
  }
}

/**
 * Generates sprites and reuses them using the file path when requested again.
 */
class SpriteFactory {
  /** Previously loaded sprites. */
  static sprites: Array<Sprite> = [];

  /**
   * Returns an instance of the sprite for the path.
   * @param path Path to the image file.
   * @param width Width of a single tile in the sprite.
   * @param height Height of a single tile in the sprite.
   */
  static getSprite(path: string, width: number, height: number) {
    const sprites = SpriteFactory.sprites.filter((s) => s.path === path);
    if (sprites.length === 1) {
      return sprites[0];
    }
    const sprite = new Sprite(path, width, height);
    SpriteFactory.sprites.push(sprite);
    return sprite;
  }
}

/**
 * Sprite.
 */
class Sprite {
  /** Path to the image file for identification by the SpriteFactory. */
  path: string;

  /** Image element for drawing on a canvas. */
  private image: HTMLImageElement = new Image();

  /** Width of a single tile in the sprite. */
  private width: number;

  /** Height of a single tile in the sprite. */
  private height: number;

  /**
   * Initializes and preloads a sprite.
   * @param path Image element for drawing on a canvas.
   * @param width Width of a single tile in the sprite.
   * @param height Height of a single tile in the sprite.
   */
  constructor(path: string, width: number, height: number) {
    this.path = path;
    this.image.src = path;
    this.width = width;
    this.height = height;
  }

  /**
   * Draws a tile from the sprite of the specified size into a RenderingContext.
   * @param ctx RenderingContext.
   * @param number Number of the tile in the sprite to be drawn.
   * @param x X position in the canvas to draw on.
   * @param y Y position in the canvas to draw on.
   * @param width Width in which to draw.
   * @param height Height in which to draw.
   */
  draw(ctx: RenderingContext, number: number, x: number, y: number, width: number, height: number) {
    ctx.ctx.drawImage(
      this.image,
      this.width * number,
      0,
      this.width,
      this.height,
      x,
      y,
      width,
      height
    );
  }
}
