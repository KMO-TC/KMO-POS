import { supabase } from '../config/supabase';
import { Alert } from '../components/LocalizedAlert';

export async function confirmAndSignOut() {
  const confirmed = await new Promise((resolve) => {
    Alert.alert(
      'အကောင့်ထွက်ရန်',
      'အကောင့်မှ ထွက်ရန် သေချာပါသလား?',
      [
        { text: 'မထွက်ပါ', style: 'cancel', onPress: () => resolve(false) },
        { text: 'ထွက်မည်', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

  if (!confirmed) return false;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return true;
}

export function showSignOutError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const alertMessage = `အကောင့်မှ ထွက်၍ မရပါ။ ${message}`;

  Alert.alert('အမှား', alertMessage);
}
