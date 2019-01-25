import { WorldDescription } from './world.description';
import { BehaviorSubject } from 'rxjs';

// https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/AsyncFunction
const AsyncFunction = Object.getPrototypeOf(async function() { }).constructor;

/**
 * Representation of the game world.
 */
export class World {
  /** States of the world, where the first state is always the most recent. */
  states: Array<WorldState>;

  /** Size of the world. */
  size: Size;

  /** Duration of a step in milliseconds. */
  animationSpeed = 1000;

  /** Command is in progress. */
  commandInProgress = new BehaviorSubject(false);

  /** Code is being executed, but should be terminated. */
  codeShouldTerminate = false;

  /** Executable commands. */
  readonly commands = {
    // Go forward, if possible
    [Command.goForward]: (state: WorldState) => {
      const curTile = state.getTile(state.truck.position);
      // Check for roads
      if (curTile.hasOpeningInDirection(state.truck.facingDirectionAfterMove)) {
        // Check if traffic light is green
        const trafficLight = curTile.trafficLight(DirectionUtil.opposite(state.truck.facingDirection));
        if (trafficLight == null || trafficLight.isGreen(this.timeStep)) {
          state.truck.move();
          state.time = 1;
          return state;
        }
        throw new RedLightViolationError();
        // Curves can also be taken without set turn signal
      } else if (curTile.isCurve() && state.truck.turning === TurnDirection.Straight) {
        state.truck.move(curTile.curveTurnDirection(state.truck.facingDirection));
        state.time = 1;
        return state;
      }
      throw new StrayedOffTheRoadError();
    },

    // Set turn signal left
    [Command.turnLeft]: (state: WorldState): WorldState => {
      state.truck.turn(TurnDirection.Left);
      state.time = 0;
      return state;
    },

    // Set turn signal right
    [Command.turnRight]: (state: WorldState): WorldState => {
      state.truck.turn(TurnDirection.Right);
      state.time = 0;
      return state;
    },

    // Turn off turn signal
    [Command.noTurn]: (state: WorldState): WorldState => {
      state.truck.turn(TurnDirection.Straight);
      state.time = 0;
      return state;
    },

    // Load freight if possible
    [Command.load]: (state: WorldState): WorldState => {
      const tile = state.getTile(state.truck.position);
      if (state.truck.freightItems === 0 && tile.freightItems > 0) {
        state.truck.loadFreight(tile.removeFreight());
        state.time = 1;
        return state;
      }
      throw new LoadingError();
    },

    // Unload freight if possible
    [Command.unload]: (state: WorldState): WorldState => {
      const tile = state.getTile(state.truck.position);
      // Is freight loaded?
      if (state.truck.freightItems > 0) {
        // Can be unloaded on target?
        if (state.truck.freightItem() === tile.freightTarget) {
          state.truck.unloadFreight();
          state.time = 1;
          return state;
          // Can be unloaded on empty field?
        } else if (tile.freightItems === 0 && tile.freightTarget == null) {
          tile.addFreight(state.truck.unloadFreight());
          state.time = 1;
          return state;
        }
      }
      throw new UnloadingError();
    },

    // Wait a step without activity
    [Command.wait]: (state: WorldState): WorldState => {
      state.time = 1;
      return state;
    },

    // Do nothing, but still check if program should terminate
    [Command.doNothing]: (state: WorldState): WorldState => {
      return null;
    },
  };

  /** Sensors. */
  readonly sensors = {
    // Is the traffic light in front of the truck red?
    [Sensor.lightIsRed]: (state: WorldState): boolean => {
      const trafficLight = state.getTile(state.truck.position).trafficLight(DirectionUtil.opposite(state.truck.facingDirection));
      return trafficLight != null && trafficLight.isRed(this.timeStep);
    },

    // Is the traffic light in front of the truck green?
    [Sensor.lightIsGreen]: (state: WorldState): boolean => {
      const trafficLight = state.getTile(state.truck.position).trafficLight(DirectionUtil.opposite(state.truck.facingDirection));
      return trafficLight != null && trafficLight.isGreen(this.timeStep);
    },

    // Can the truck go straight?
    [Sensor.canGoStraight]: (state: WorldState): boolean => {
      return state
        .getTile(state.truck.position)
        .hasOpeningInDirection(state.truck.facingDirection);
    },

    // Can the truck turn left?
    [Sensor.canTurnLeft]: (state: WorldState): boolean => {
      return state
        .getTile(state.truck.position)
        .hasOpeningInDirection(DirectionUtil.turn(state.truck.facingDirection, TurnDirection.Left));
    },

    // Can the truck turn right?
    [Sensor.canTurnRight]: (state: WorldState): boolean => {
      return state
        .getTile(state.truck.position)
        .hasOpeningInDirection(DirectionUtil.turn(state.truck.facingDirection, TurnDirection.Right));
    },

    // Is the world solved?
    [Sensor.isSolved]: (state: WorldState): boolean => {
      return state.solved();
    },
  };

  /**
   * Initializes the world following the world description with an initial
   * state.
   * @param desc Description of the world.
   */
  constructor(desc: WorldDescription) {
    this.size = new Size(desc.size.width, desc.size.height);

    const truck = new Truck(
      new Position(desc.trucks[0].position.x, desc.trucks[0].position.y, this),
      DirectionUtil.toNumber(DirectionUtil.fromChar(desc.trucks[0].facing)),
      desc.trucks[0].freight.map((f) => ({
        'Red': Freight.Red,
        'Green': Freight.Green,
        'Blue': Freight.Blue
      }[f]))
    );

    const tiles = desc.tiles.map((tile) => {
      // Defaults
      let openings = TileOpening.None;
      let freight: Freight[] = [];
      let freightTarget: Freight = null;
      let trafficLights: TrafficLight[] = [];

      // Openings
      if (tile.openings) {
        openings = tile.openings.reduce(
          (a, v) => a | DirectionUtil.toTileOpening(DirectionUtil.fromChar(v)),
          TileOpening.None
        );
      }

      // Freight
      if (tile.freight) {
        freight = tile.freight.map((f) => ({
          'Red': Freight.Red,
          'Green': Freight.Green,
          'Blue': Freight.Blue
        }[f]));
      }

      // Freight target
      if (tile.freightTarget) {
        freightTarget = {
          'Red': Freight.Red,
          'Green': Freight.Green,
          'Blue': Freight.Blue
        }[tile.freightTarget];
      }

      // Traffic lights
      if (tile.trafficLights) {
        trafficLights = tile.trafficLights.map((t) =>
          new TrafficLight(t.redPhase, t.greenPhase, t.startPhase)
        );
      }

      return new Tile(
        new Position(tile.position.x, tile.position.y, this),
        openings, freight, freightTarget, trafficLights
      );
    });

    this.states = [new WorldState(0, tiles, truck, 1)];
  }

  /**
   * Returns the current state.
   * @return Current state.
   */
  get state(): WorldState {
    return this.states[0];
  }

  /**
   * Returns the state of a particular step.
   * @param step Number of the state.
   * @return State.
   */
  getState(step: number): WorldState {
    return step >= 0 && step < this.states.length
      ? this.states[this.states.length - 1 - step]
      : null;
  }

  /**
   * Returns the number of the current step (starting at 0).
   * @return Number of the current step (starting at 0).
   */
  get step(): number {
    return this.states.length - 1;
  }

  /**
   * Returns the past time steps.
   * @return Past time steps.
   */
  get timeStep(): number {
    return this.states.reduce((a: number, v: WorldState) => a + v.time, 0);
  }

  /**
   * Passes a copy of the current state to the passed function and inserts the
   * changed state as the current state if the return value of the passed
   * function is not null.
   * @param f Function that receives a copy of the current state, makes changes
   *          if necessary and returns it.
   * @return Changed state.
   */
  mutateState(f: (state: WorldState) => WorldState): WorldState {
    const state = f(this.state.clone());
    if (state != null) {
      state.prev = this.state;
      state.step = this.states.unshift(state) - 1;
    }
    return state;
  }

  /**
   * Passes a copy of the current state to the passed function and inserts the
   * changed state as the current state if the return value of the passed
   * function is not null. The returned promise will be resolved when the time
   * scheduled for the action in this change of state is over.
   * @param f Function that receives a copy of the current state, makes changes
   *          if necessary and returns it.
   * @return Promise, which is resolved when the scheduled time is over.
   */
  mutateStateAsync(f: (state: WorldState) => WorldState): Promise<void> {
    const state = this.mutateState(f);
    return new Promise((resolve, reject) => {
      setTimeout(
        () => resolve(),
        Math.max(
          state != null
            ? state.time * this.animationSpeed
            : 0,
          1 // always pause for at least a very short time to avoid busy waiting
        )
      );
    });
  }

  /**
   * Undoes the last change of state.
   */
  undo() {
    if (this.states.length > 1) {
      this.states.shift();
    }
  }

  /**
   * Resets the world state.
   */
  reset() {
    while (this.states.length > 1) {
      this.undo();
    }
  }

  /**
   * Indicates whether all freight has been delivered to their destination.
   * @return True, when all freight has been delivered to their destination,
   *         otherwise false.
   */
  get solved(): boolean {
    return this.state.solved();
  }

  /**
   * Executes a command on the world.
   * @param command Command to be executed.
   */
  command(command: Command) {
    this.mutateState(this.commands[command]);
  }

  /**
   * Executes a command on the world. The returned promise will be resolved when
   * the time scheduled for the action in this change of state is over. Also
   * sets `commandInProgress`.
   * @param command Command to be executed.
   * @return Promise, which is resolved when the scheduled time is over.
   */
  async commandAsync(command: Command): Promise<void> {
    this.commandInProgress.next(true);
    this.codeShouldTerminate = false;
    try {
      await this._commandAsync(command);
    } catch (error) {
      if (!error.expected) {
          throw error;
      }
    } finally {
      this.commandInProgress.next(false);
    }
  }

  /**
   * Executes a command on the world. The returned promise will be resolved when
   * the time scheduled for the action in this change of state is over. This
   * function doesn't set `commandInProgress`, so it should only be called by a
   * function that does that.
   * @param command Command to be executed.
   * @return Promise, which is resolved when the scheduled time is over.
   */
  private async _commandAsync(command: Command): Promise<void> {
    if (this.codeShouldTerminate) {
      throw new TerminatedError();
    }
    await this.mutateStateAsync(this.commands[command]);
  }

  /**
   * Queries a sensor and returns the result.
   * @param sensor Sensor to be queried.
   * @return Result of the sensor.
   */
  sensor(sensor: Sensor): boolean {
    return this.sensors[sensor](this.state);
  }

  /**
   * Executes a string of JavaScript-Code inside a function with the proper
   * this-context.
   * @param code Code to be executed.
   */
  async runCode(code: string) {
    this.commandInProgress.next(true);
    this.codeShouldTerminate = false;

    try {
      const f = new AsyncFunction(code);

      await f.call({
        goForward: async () => { await this._commandAsync(Command.goForward); },
        turnLeft: async () => { await this._commandAsync(Command.turnLeft); },
        turnRight: async () => { await this._commandAsync(Command.turnRight); },
        noTurn: async () => { await this._commandAsync(Command.noTurn); },
        wait: async () => { await this._commandAsync(Command.wait); },
        load: async () => { await this._commandAsync(Command.load); },
        unload: async () => { await this._commandAsync(Command.unload); },
        doNothing: async () => { await this._commandAsync(Command.doNothing); },

        lightIsRed: () => this.sensor(Sensor.lightIsRed),
        lightIsGreen: () => this.sensor(Sensor.lightIsGreen),
        canGoStraight: () => this.sensor(Sensor.canGoStraight),
        canTurnLeft: () => this.sensor(Sensor.canTurnLeft),
        canTurnRight: () => this.sensor(Sensor.canTurnRight),
        isSolved: () => this.sensor(Sensor.isSolved),
      });
    } catch (error) {
      // Only display unexpected errors
      if (!error.expected) {
        if (typeof error.msg !== 'undefined') {
          // Forward the "nice" errors
          throw error;
        } else {
          // Display the "bad" errors
          console.error(error);
          alert(error);
        }
      }
    } finally {
      this.commandInProgress.next(false);
    }
  }

  /**
   * Terminates the code currently running asap.
   */
  terminateCode() {
    this.codeShouldTerminate = true;
  }
}

/**
 * State of a world.
 */
export class WorldState {
  /** Step for this state. */
  step: number;

  /** Time steps that are sheduled for the execution of this step.  */
  time: number;

  /** Tiles from left to right and top to bottom. */
  tiles: Array<Tile>;

  /** Truck. */
  truck: Truck;

  /** Previous state. */
  prev: WorldState;

  /**
   * Initializes a new state of the world.
   * @param step Step for this state.
   * @param tiles Tiles from left to right and top to bottom.
   * @param truck Truck.
   * @param time Time steps that are sheduled for the execution of this step.
   * @param prev Previous state.
   */
  constructor(step: number, tiles: Tile[], truck: Truck, time: number = 0, prev: WorldState = null) {
    this.step = step;
    this.time = time;
    this.tiles = tiles;
    this.truck = truck;
    this.prev = prev;
  }

  /**
   * Returns the time steps past in this step and all previous steps.
   * @return time steps.
   */
  get timeStep(): number {
    if (this.prev === null) { return this.time; }
    return this.time + this.prev.timeStep;
  }

  /**
   * Returns the tile at the passed position.
   * @param pos Position of the requested tile.
   * @return Tile at the passed position.
   */
  getTile(pos: Position): Tile {
    return this.tiles[pos.y * pos.width + pos.x];
  }

  /**
   * Indicates whether all freight has been delivered to their destination.
   * @return True, when all freight has been delivered to their destination,
   *         otherwise false.
   */
  solved(): boolean {
    return this.truck.freightItems === 0 && !this.tiles.some((t) => t.freightItems > 0);
  }

  /**
   * Creates a copy of the state.
   * @return Copy of the state.
   */
  clone(): WorldState {
    return new WorldState(
      this.step,
      this.tiles.map((t) => t.clone()),
      this.truck.clone(),
      this.time,
      this.prev
    );
  }
}

/**
 * Truck.
 */
export class Truck {
  /** Position on the field. */
  position: Position;

  /** Current direction of travel of the truck (n * 90) starting from 0 = west. */
  facing: number;

  /** Turn signal. */
  turning: TurnDirection;

  /** Freight. */
  freight: Array<Freight>;

  /**
   * Initializes a truck.
   * @param position Position on the field.
   * @param facing Current direction of travel of the truck.
   * @param freight Freight.
   */
  constructor(position: Position, facing: number, freight: Array<Freight> = [], turning: TurnDirection = TurnDirection.Straight) {
    this.position = position;
    this.facing = facing;
    this.freight = freight;
    this.turning = turning;
  }

  /**
   * Loads a freight.
   * @param freight Freight.
   */
  loadFreight(freight: Freight) {
    this.freight.push(freight);
  }

  /**
   * Unloads a freight and returns it.
   * @param n Position of the freight.
   * @return Freight unloaded, null if no freight was unloaded.
   */
  unloadFreight(n: number = 0): Freight {
    const freight = this.freightItem(n);
    if (freight != null) {
      this.freight.splice(n, 1);
    }
    return freight;
  }

  /**
   * Returns the number of loaded freight items.
   * @return Number of freight items.
   */
  get freightItems(): number {
    return this.freight.length;
  }

  /**
   * Returns a certain freight item.
   * @param n Position of the freight.
   * @return Freight.
   */
  freightItem(n: number = 0): Freight {
    return this.freightItems > n ? this.freight[n] : null;
  }

  /**
   * Returns the color of the freight, null if empty.
   * @param n Position of the freight.
   * @return Color of the freight, null if empty.
   */
  freightColor(n: number = 0): string {
    return this.freightItem(n);
  }

  /**
   * Returns the direction of travel of the truck.
   * @return Direction of travel.
   */
  get facingDirection(): Direction {
    const f = this.facing;
    if (f % 4 === 1 || f % 4 === -3) { return Direction.East; }
    if (f % 4 === 2 || f % 4 === -2) { return Direction.South; }
    if (f % 4 === 3 || f % 4 === -1) { return Direction.West; }
    return Direction.North;
  }

  /**
   * Returns the direction of travel after a forward movement in response to the
   * turn signal.
   * @return Direction after forward movement.
   */
  get facingDirectionAfterMove(): Direction {
    return DirectionUtil.turn(this.facingDirection, this.turning);
  }

  /**
   * Returns the position after a forward movement.
   * @return Position after forward movement.
   */
  get positionAfterMove(): Position {
    const pos = this.position.clone();
    if (this.facingDirectionAfterMove === Direction.North) {
      pos.y--;
    } else if (this.facingDirectionAfterMove === Direction.East) {
      pos.x++;
    } else if (this.facingDirectionAfterMove === Direction.South) {
      pos.y++;
    } else if (this.facingDirectionAfterMove === Direction.West) {
      pos.x--;
    }
    return pos;
  }

  move(turnDirection: TurnDirection = null) {
    // Overwrite turning direction
    if (turnDirection != null) { this.turning = turnDirection; }

    // New direction of travel and position
    this.position = this.positionAfterMove;
    this.facing += this.turning;

    // Turn off the turn signal
    this.turning = TurnDirection.Straight;
  }

  /**
   * Overwrites the current turn direction.
   * @param turnDirection Direction to turn in next.
   */
  turn(turnDirection: TurnDirection) {
    this.turning = turnDirection;
  }

  /**
   * Creates a copy of the truck.
   * @return Copy of the truck.
   */
  clone(): Truck {
    return new Truck(
      this.position.clone(),
      this.facing,
      this.freight.slice(0),
      this.turning
    );
  }
}

/**
 * Tile on the field.
 */
export class Tile {
  /** Position on the field. */
  position: Position;

  /** Specifies in which directions the tile is passable. */
  openings: TileOpening;

  /**  Freight on the tile. */
  freight: Array<Freight>;

  /**
   * Specifies which freight target is on the tile, null if none. There must be
   * no freight on a tile with a target.
   */
  freightTarget: Freight;

  /**
   * Traffic lights in the order north, east, south, west. Fill unused traffic
   * lights with null
   */
  trafficLights: Array<TrafficLight>;

  /**
   * Initializes a tile.
   * @param position Position on the field.
   * @param openings Directions in which the tile is passable.
   * @param freight Freight.
   * @param freightTarget Freight target.
   * @param trafficLights Traffic lights.
   */
  constructor(position: Position, openings: TileOpening,
    freight: Array<Freight> = [], freightTarget: Freight = null,
    trafficLights: Array<TrafficLight> = []) {
    this.position = position;
    this.openings = openings;
    this.freight = freight;
    this.freightTarget = freightTarget;
    this.trafficLights = trafficLights;
  }

  /**
   * Returns whether the field is passable in a certain direction.
   * @param direction Direction to be checked.
   * @return True if passable in the direction, otherwise false.
   */
  hasOpeningInDirection(direction: Direction): boolean {
    return this.hasOpening(DirectionUtil.toTileOpening(direction));
  }

  /**
   * Returns whether the field is passable in a certain direction.
   * @param opening Direction to be checked.
   * @return True if passable in the direction, otherwise false.
   */
  hasOpening(opening: TileOpening): boolean {
    return (this.openings & opening) === opening;
  }

  /**
   * Checks if the tile is a curve.
   * @return True, if the tile is a curve, otherwise false.
   */
  isCurve(): boolean {
    return this.openings === (TileOpening.North | TileOpening.East)
      || this.openings === (TileOpening.East | TileOpening.South)
      || this.openings === (TileOpening.South | TileOpening.West)
      || this.openings === (TileOpening.North | TileOpening.West);
  }

  /**
   * Specifies the direction in which the truck must turn on a curve.
   * @param direction Driving direction of the truck.
   * @return Turn direction, undefined if tile is not a curve.
   */
  curveTurnDirection(direction: Direction): TurnDirection {
    return this.hasOpeningInDirection(DirectionUtil.turn(direction, TurnDirection.Left))
      ? TurnDirection.Left
      : TurnDirection.Right;
  }

  /**
   * Returns the number of pieces of freight on the tile.
   * @return Number of pieces of freight.
   */
  get freightItems(): number {
    return this.freight.length;
  }

  /**
   * Returns a freight from the field.
   * @param n Number of the freight.
   * @return Freight.
   */
  freightItem(n: number = 0): Freight {
    return this.freightItems > n ? this.freight[n] : null;
  }

  /**
   * Adds a freight on the field.
   * @param freight Freight.
   */
  addFreight(freight: Freight) {
    this.freight.push(freight);
  }

  /**
   * Removes freight from the field.
   * @param n Number of the freight.
   * @return Removed freight.
   */
  removeFreight(n: number = 0): Freight {
    const freight = this.freightItem(n);
    if (freight != null) {
      this.freight.splice(n, 1);
    }
    return freight;
  }

  /**
   * Returnes the color of the freight or target.
   * @return Color of the freight or target.
   */
  freightColor(n: number = 0): string {
    if (this.freightTarget) { return this.freightTarget; }
    return this.freightItem(n);
  }

  /**
   * Returns the traffic light that regulates the traffic coming from the
   * specified direction.
   * @param direction Direction.
   * @return Traffic light if existing, otherwise null.
   */
  trafficLight(direction: Direction) {
    const n = DirectionUtil.toNumber(direction);
    return this.trafficLights.length > n
      ? this.trafficLights[n]
      : null;
  }

  /**
   * Creates a copy of the tile.
   * @return Copy of the tile.
   */
  clone(): Tile {
    return new Tile(
      this.position.clone(),
      this.openings,
      this.freight.slice(0),
      this.freightTarget,
      this.trafficLights.map((t) => t ? t.clone() : t)
    );
  }
}

/**
 * Traffic light.
 */
export class TrafficLight {
  /** Duration of the red phase in steps. */
  redPhase: number;

  /** Duration of the green phase in steps. */
  greenPhase: number;

  /** Step at which counting should start. */
  initial: number;

  /**
   * Initializes the traffic light.
   * @param redPhase Duration of the red phase in steps.
   * @param greenPhase Duration of the green phase in steps.
   * @param initial Step at which counting should start.
   */
  constructor(redPhase: number, greenPhase: number, initial: number = 0) {
    this.redPhase = redPhase;
    this.greenPhase = greenPhase;
    this.initial = initial;
  }

  /**
   * Returns whether the traffic light in the given step is red.
   * @param step Step for which the traffic light state is to be calculated.
   * @return True if the traffic light is red, otherwise false.
   */
  isRed(step: number): boolean {
    return (step + this.initial) % (this.redPhase + this.greenPhase) < this.redPhase;
  }

  /**
   * Returns whether the traffic light in the given step is green.
   * @param step Step for which the traffic light state is to be calculated.
   * @return True if the traffic light is green, otherwise false.
   */
  isGreen(step: number): boolean {
    return !this.isRed(step);
  }

  /**
   * Creates a copy of the traffic light.
   * @return Copy of the traffic light.
   */
  clone(): TrafficLight {
    return new TrafficLight(
      this.redPhase,
      this.greenPhase,
      this.initial
    );
  }
}

/**
 * Size from width and height.
 */
export class Size {
  /**
   * Initializes a size.
   * @param width Width.
   * @param height Height.
   */
  constructor(public width: number, public height: number) { }

  /**
   * Creates a copy of the size.
   * @return Copy of the size.
   */
  clone(): Size {
    return new Size(
      this.width,
      this.height
    );
  }
}

/**
 * 2D position with reference to the world.
 */
export class Position {
  /**
   * Initializes the position.
   * @param x X-position.
   * @param y Y-position.
   * @param welt World to which the position refers.
   */
  constructor(public x: number, public y: number, readonly world: World) { }

  /**
   * Width of the associated world.
   */
  get width() {
    return this.world.size.width;
  }

  /**
   * Height of the associated world.
   */
  get height() {
    return this.world.size.height;
  }

  /**
   * Creates a copy of the position.
   * @return Copy of the position.
   */
  clone(): Position {
    return new Position(
      this.x,
      this.y,
      this.world
    );
  }
}

/**
 * Type of freight.
 */
export enum Freight {
  /** Red. */
  Red = 'red',

  /** Green. */
  Green = 'green',

  /** Blue. */
  Blue = 'blue',
}

/**
 * Bitmask for the passable edges of a tile.
 */
export enum TileOpening {
  /** No opening. */
  None = 0,

  /** North. */
  North = 1 << 0,

  /** East. */
  East = 1 << 1,

  /** South. */
  South = 1 << 2,

  /** West. */
  West = 1 << 3,

  /** Shorthands. */
  N = North,
  E = East,
  S = South,
  W = West,
}

/**
 * Direction.
 */
export enum Direction {
  /** North. */
  North = 'North',

  /** East. */
  East = 'East',

  /** South. */
  South = 'South',

  /** West. */
  West = 'West',
}

/**
 * Helper class for `Direction`
 */
export class DirectionUtil {
  /**
   * Returns the opposite direction of a given direction.
   * @param direction Direction.
   * @return Opposite direction.
   */
  public static opposite(direction: Direction) {
    return {
      [Direction.North]: Direction.South,
      [Direction.East]: Direction.West,
      [Direction.South]: Direction.North,
      [Direction.West]: Direction.East,
    }[direction];
  }

  /**
   * Returns the corresponding `TileOpening` for a given direction.
   * @param direction Direction.
   */
  public static toTileOpening(direction: Direction): TileOpening {
    return {
      [Direction.North]: TileOpening.North,
      [Direction.East]: TileOpening.East,
      [Direction.South]: TileOpening.South,
      [Direction.West]: TileOpening.West
    }[direction];
  }

  /**
   * Returns the corresponding number for a given direction (north = 0,
   * continuing clockwise).
   * @param direction Direction.
   */
  public static toNumber(direction: Direction): number {
    return {
      [Direction.North]: 0,
      [Direction.East]: 1,
      [Direction.South]: 2,
      [Direction.West]: 3
    }[direction];
  }

  /**
   * Returns the direction after a turn.
   * @param direction Direction.
   * @param turnDirection Turning direction.
   * @return New direction.
   */
  public static turn(direction: Direction, turnDirection: TurnDirection): Direction {
    if (turnDirection === TurnDirection.Straight) { return direction; }
    return {
      [TurnDirection.Left]: {
        [Direction.North]: Direction.West,
        [Direction.East]: Direction.North,
        [Direction.South]: Direction.East,
        [Direction.West]: Direction.South,
      },
      [TurnDirection.Right]: {
        [Direction.North]: Direction.East,
        [Direction.East]: Direction.South,
        [Direction.South]: Direction.West,
        [Direction.West]: Direction.North,
      }
    }[turnDirection][direction];
  }

  /**
   * Returns the direction for a string.
   * @param c Direction as string (N, E, S, W).
   * @return Direction.
   */
  public static fromChar(c: string): Direction {
    return {
      'N': Direction.North,
      'E': Direction.East,
      'S': Direction.South,
      'W': Direction.West,
    }[c];
  }
}

/**
 * Turning direction.
 */
export enum TurnDirection {
  /** Straight. */
  Straight = 0,

  /** Left. */
  Left = -1,

  /** Right. */
  Right = +1,
}

/** Executable commands. */
export enum Command {
  /** Go forward, if possible. */
  goForward,

  /** Set turn signal left. */
  turnLeft,

  /** Set turn signal right. */
  turnRight,

  /** Turn off turn signal. */
  noTurn,

  /** Load freight if possible. */
  load,

  /** Unload freight if possible. */
  unload,

  /** Wait a step without activity. */
  wait,

  /** Do nothing, but still check if program should terminate. */
  doNothing,
}

/** Sensors. */
export enum Sensor {
  /** Is the traffic light in front of the truck red? */
  lightIsRed,

  /** Is the traffic light in front of the truck green? */
  lightIsGreen,

  /** Can the truck go straight? */
  canGoStraight,

  /** Can the truck turn left? */
  canTurnLeft,

  /** Can the truck turn right? */
  canTurnRight,

  /** Is the world solved? */
  isSolved,
}

/** General Exception. */
export class TruckError extends Error {
  readonly expected: boolean = false;
  readonly msg: string = '';
}

/** Exception while trying to leave the paved road. */
export class StrayedOffTheRoadError extends TruckError {
  readonly msg: string = 'Dein Lastwagen wäre fast von der Straße abgekommen!';
}

/** Exception while crossing a red traffic light. */
export class RedLightViolationError extends TruckError {
  readonly msg: string = 'Du hättest fast eine Rote Ampel übersehen!';
}

/** Exception while loading. */
export class LoadingError extends TruckError {
  readonly msg: string = 'Hier kannst du nichts laden!';
}

/** Exception while unloading. */
export class UnloadingError extends TruckError {
  readonly msg: string = 'Hier kannst du nichts abladen!';
}

/** Exception while unloading. */
export class TerminatedError extends TruckError {
  readonly expected: boolean = true;
  readonly msg: string = 'Das Programm wurde beendet.';
}
