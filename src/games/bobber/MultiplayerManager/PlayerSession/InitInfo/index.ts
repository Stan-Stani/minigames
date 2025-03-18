interface IInitInfo {
  pronouns: Pronouns
  timestamp: number | null
  tint: number | null
}

/**
 * Represents the self-determined identity of a user.
 * No errors if the nick already exists.
 */
interface Pronouns {
  /** Text that identifies this player. Will be randomly assigned
   * if player doesn't enter a nickname.
   */
  nickname: string | null
}

export class InitInfo implements IInitInfo {
  pronouns: Pronouns = { nickname: null }
  timestamp: number | null = null
  tint: number | null = null

  /** Pass Date.now() to constructor to indicate this computer's
   * initialization of its local player.
   */
  constructor(timestamp: number | null = null) {
    this.timestamp = timestamp
  }
}
