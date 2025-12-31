// ✅ Polyfills pour Web et React Native
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// ✅ Polyfill sécurisé pour crypto.getRandomValues (sans import de Node)
if (typeof global !== 'undefined' && typeof global.crypto === 'undefined') {
  try {
    if (typeof window !== 'undefined' && window.crypto) {
      // Utilise le crypto du navigateur (cas web)
      global.crypto = window.crypto;
    } else {
      // Fallback minimal (cas React Native)
      global.crypto = {
        getRandomValues: (array: Uint8Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
          }
          return array;
        },
      };
    }
  } catch (err) {
    console.warn('⚠️ crypto non disponible — fallback utilisé');
  }
}

// ✅ Polyfill pour TextEncoder/TextDecoder sur React Native
if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

console.log('✅ Polyfills My Church chargés avec succès');
 