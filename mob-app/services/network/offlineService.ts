import { announceToScreenReader } from '../accessibility/accessibilityUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_KEY = '@vox/offline_queue';
const MAX_RETRIES = 3;

/**
 * Offline Service
 * Handles offline detection, action queuing, and sync
 */
class OfflineService {
  private isOnline: boolean = true;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private syncInProgress: boolean = false;

  /**
   * Initialize offline service
   * Note: Network state detection should be implemented via API health checks
   * or by using expo-network if available
   */
  async initialize(): Promise<void> {
    // Default to online, will be updated by API calls
    this.isOnline = true;
  }

  /**
   * Set online/offline state (called by API interceptors)
   */
  setOnlineState(isOnline: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;

    if (wasOnline !== isOnline) {
      this.handleNetworkChange(isOnline);
    }
  }

  /**
   * Handle network state changes
   */
  private async handleNetworkChange(isOnline: boolean): Promise<void> {
    // Notify listeners
    this.listeners.forEach((listener) => listener(isOnline));

    if (isOnline) {
      await announceToScreenReader('Connection restored', { isAlert: true });
      // Attempt to sync queued actions
      await this.syncQueuedActions();
    } else {
      await announceToScreenReader('You are offline. Some features may not work.', { isAlert: true });
    }
  }

  /**
   * Subscribe to network state changes
   */
  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.isOnline);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Queue an action for later execution when online
   */
  async queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    const queue = await this.getQueue();
    queue.push(queuedAction);
    await this.saveQueue(queue);

    return queuedAction.id;
  }

  /**
   * Get all queued actions
   */
  async getQueue(): Promise<QueuedAction[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting queue:', error);
      return [];
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(queue: QueuedAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  /**
   * Remove action from queue
   */
  async removeAction(actionId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((action) => action.id !== actionId);
    await this.saveQueue(filtered);
  }

  /**
   * Clear all queued actions
   */
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  }

  /**
   * Sync queued actions (execute them when online)
   */
  async syncQueuedActions(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    const queue = await this.getQueue();

    if (queue.length === 0) {
      this.syncInProgress = false;
      return;
    }

    await announceToScreenReader(`Syncing ${queue.length} queued actions`);

    const failedActions: QueuedAction[] = [];

    for (const action of queue) {
      try {
        // Execute action (this should be implemented by the caller)
        // For now, we'll just remove successfully processed actions
        // In a real implementation, you'd call the appropriate API/service
        
        // If action fails, increment retries
        if (action.retries < MAX_RETRIES) {
          action.retries++;
          failedActions.push(action);
        } else {
          // Max retries reached, remove from queue
          console.warn(`Action ${action.id} exceeded max retries, removing from queue`);
        }
      } catch (error) {
        console.error(`Error syncing action ${action.id}:`, error);
        if (action.retries < MAX_RETRIES) {
          action.retries++;
          failedActions.push(action);
        }
      }
    }

    // Save failed actions back to queue
    await this.saveQueue(failedActions);

    if (failedActions.length === 0) {
      await announceToScreenReader('All queued actions synced successfully');
    } else {
      await announceToScreenReader(`${failedActions.length} actions failed to sync and will be retried`);
    }

    this.syncInProgress = false;
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{ queued: number; syncing: boolean }> {
    const queue = await this.getQueue();
    return {
      queued: queue.length,
      syncing: this.syncInProgress,
    };
  }
}

export const offlineService = new OfflineService();

