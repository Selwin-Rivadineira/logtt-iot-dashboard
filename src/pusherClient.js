// Re-exportar desde la librería central src/lib/pusher.js
import pusher, {
  pusherConfig,
  getPusherClient,
  subscribe,
  unsubscribe,
  isPusherConfigured
} from './lib/pusher';

export {
  pusherConfig,
  getPusherClient,
  subscribe as subscribeToChannel,
  unsubscribe,
  isPusherConfigured
};

export default pusher;
