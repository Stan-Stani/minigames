interface ITinter {
  readonly tints: number[]
  available: number[]
  used: number[]

  /** Returns the consumed tint. */
  consumeTint(this: ITinter, tint: number): number
  /** Returns the consumed tint. */
  decideMyTint(this: ITinter): number
}

export class Tinter implements ITinter {
  constructor(
    tints = [
      0xff5733, // Bright red-orange
      0x33ff57, // Bright green
      0x3357ff, // Bright blue
      0xf3ff33, // Bright yellow
      0xf033ff, // Bright magenta
      0x33fff3, // Bright cyan
      0x8033ff, // Purple
      0xff338a, // Pink
      0xff9933, // Orange
      0x99ff33, // Lime
      0x33ff99, // Mint
      0x3399ff, // Sky blue
      0x9933ff, // Violet
      0xffd433, // Gold
      0x33ffd4, // Turquoise
      0xd433ff, // Lavender
      0xff3333, // Red
      0x33ff33, // Green
      0x6b33ff, // Indigo
      0xff33d4, // Hot pink
    ]
  ) {
    this.tints = [...tints]
    this.available = [...tints]
  }
  readonly tints: number[]
  available: number[]
  used: number[] = []

  consumeTint(tint: number) {
    const tints = this
    const indexToRemove = tints.available.findIndex((t) => t === tint)
    return tints.available.splice(indexToRemove, 1)[0]
  }

  decideMyTint() {
    const tints = this

    const chosenTint = tints.#consumeRandomTint()
    return chosenTint
  }

  /** Returns moved tint */
  #moveRandomTint(source: number[], destination: number[]) {
    const indexToRemove = Math.floor(Math.random() * source.length)
    const movedTint = source.splice(indexToRemove, 1)[0]
    destination.push(movedTint)
    return movedTint
  }

  /**
   * If no available tints, resets `available` to
   * all tints and clears used tints. Then gets random.
   *
   * Returns the consumed tint.
   *
   */
  #consumeRandomTint() {
    const tints = this

    if (tints.available.length < 1) {
      tints.available = [...tints.used]
      tints.used = []
    }

    return tints.#moveRandomTint(this.available, this.used)
  }
}
