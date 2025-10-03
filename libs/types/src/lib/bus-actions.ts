export interface BusAction<T> {
  type: string;
  payload: T;
}
