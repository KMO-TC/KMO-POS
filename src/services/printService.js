import {
  Platform,
} from 'react-native';
import * as Print from 'expo-print';

export async function printHtmlDocument(html) {
  if (Platform.OS !== 'web') {
    await Print.printAsync({ html });
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Print window was blocked. Allow pop-ups and try again.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  await new Promise((resolve, reject) => {
    let printed = false;
    const print = () => {
      if (printed) return;
      printed = true;
      try {
        printWindow.focus();
        printWindow.print();
        resolve();
      } catch (error) {
        reject(error);
      }
    };

    printWindow.addEventListener('load', print, { once: true });
    window.setTimeout(print, 250);
  });
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
