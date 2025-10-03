import { BusAction } from '@nimlat/types/bus-actions';
import type { Database } from 'better-sqlite3';
import { BehaviorSubject, Subject } from 'rxjs';

type Db = Database | null;

export enum ActionBusNetwork {
  ConnectivityChanged = '[Bus Network] Connection Changed',
}

export const BUS_Network = new BehaviorSubject<
  BusAction<{ isOnline: boolean }>
>({ type: ActionBusNetwork.ConnectivityChanged, payload: { isOnline: false } });

export const BUS_HydratorQueueChanges = new Subject<void>();

export const BUS_Database = new BehaviorSubject<Db>(null);
