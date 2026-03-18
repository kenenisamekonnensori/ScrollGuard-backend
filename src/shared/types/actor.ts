export type ActorType = "user" | "guest";

export interface Actor {
  type: ActorType;
  id: string;
}
