import Pusher from 'pusher-js';

/**
 * Configuración de Pusher extraída directamente de las variables de entorno (.env)
 */
export const pusherConfig = {
  appId: import.meta.env.VITE_PUSHER_APP_ID || '',
  key: import.meta.env.VITE_PUSHER_KEY || '',
  secret: import.meta.env.VITE_PUSHER_SECRET || '',
  cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'us2',
  channel: import.meta.env.VITE_PUSHER_CHANNEL || 'rfid-channel',
  event: import.meta.env.VITE_PUSHER_EVENT || 'rfid-read',
};

// Instancia singleton del cliente Pusher
let clientInstance = null;
const activeChannels = new Map();

/**
 * Obtener o inicializar la instancia de Pusher
 */
export const getPusherClient = () => {
  if (!pusherConfig.key) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = new Pusher(pusherConfig.key, {
        cluster: pusherConfig.cluster,
        forceTLS: true,
      });
    } catch (err) {
      console.error('[PusherLib] Error al instanciar cliente:', err);
      return null;
    }
  }

  return clientInstance;
};

/**
 * Suscribirse a un canal y evento.
 * Devuelve una función para desuscribirse limpiamente.
 * 
 * Uso:
 * const unsubscribe = pusher.subscribe('mi-canal', 'mi-evento', (data) => { ... });
 * unsubscribe();
 */
export const subscribe = (channelName, eventName, callback) => {
  const client = getPusherClient();
  if (!client) return () => {};

  let channel = activeChannels.get(channelName);
  if (!channel) {
    channel = client.subscribe(channelName);
    activeChannels.set(channelName, channel);
  }

  channel.bind(eventName, callback);

  return () => {
    channel.unbind(eventName, callback);
  };
};

/**
 * Desuscribir un canal completamente
 */
export const unsubscribe = (channelName) => {
  const client = getPusherClient();
  if (client && activeChannels.has(channelName)) {
    client.unsubscribe(channelName);
    activeChannels.delete(channelName);
  }
};

/**
 * Verifica si las credenciales de Pusher están presentes en el entorno
 */
export const isPusherConfigured = () => Boolean(pusherConfig.key);

/**
 * Suscribirse directamente a las lecturas RFID configuradas (canal 'rfid-channel' y evento 'rfid-read')
 */
export const subscribeToRFID = (callback) => {
  return subscribe(pusherConfig.channel, pusherConfig.event, callback);
};

/**
 * API principal de la librería de Pusher
 * Importación sencilla:
 * import pusher from '@/lib/pusher' (o './lib/pusher')
 */
const pusher = {
  config: pusherConfig,
  getClient: getPusherClient,
  subscribe,
  unsubscribe,
  subscribeToRFID,
  isConfigured: isPusherConfigured,
};

export default pusher;
