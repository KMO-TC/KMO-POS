// src/Auth/LoginScreens.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { ResponsiveText as Text, LocalizedTextInput as TextInput } from '../components/ResponsiveText';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { supabase } from '../config/supabase';
import { Alert } from '../components/LocalizedAlert';

const DEFAULT_SUPPORT_PHONE = '09-979747475'; // Database တွင် phone မရှိပါက သုံးမည့် နံပါတ်

const isVersionNewer = (latestVer, currentVer) => {
  if (!latestVer || !currentVer) return false;
  const a = String(latestVer).trim().split('.').map(n => parseInt(n, 10) || 0);
  const b = String(currentVer).trim().split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const numA = a[i] || 0;
    const numB = b[i] || 0;
    if (numA > numB) return true;
    if (numA < numB) return false;
  }
  return false;
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);

  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    checkAppVersionUpdate();
  }, []);

  const handleCallSupport = async () => {
    const rawPhone = (supportPhone || DEFAULT_SUPPORT_PHONE).trim();
    const cleanedPhone = rawPhone.replace(/[^+\d]/g, '');

    if (!cleanedPhone) {
      Alert.alert('ဖုန်းနံပါတ် မရှိပါ', 'ဆက်သွယ်ရန် ဖုန်းနံပါတ် သတ်မှတ်ထားခြင်း မရှိပါ။');
      return;
    }

    const telUrl = `tel:${cleanedPhone}`;
    try {
      await Linking.openURL(telUrl);
    } catch (err) {
      Alert.alert('ဖုန်းခေါ်၍ မရပါ', `ဖုန်းနံပါတ် ${rawPhone} သို့ ခေါ်ဆိုရန် အဆင်မပြေပါ။`);
    }
  };

  const sendResetPasswordEmail = async (targetEmail) => {
    const trimmedEmail = (targetEmail || '').trim();
    if (!trimmedEmail) {
      Alert.alert('Email လိုအပ်သည်', 'စကားဝှက် ပြန်လည်သတ်မှတ်ရန် Email လိပ်စာ ထည့်ပါ။');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) throw error;

      Alert.alert(
        'Reset Link ပို့ပြီးပါပြီ',
        `${trimmedEmail} သို့ စကားဝှက် ပြန်လည်သတ်မှတ်ရန် Link ပို့ပေးထားပါသည်။ Email (သို့မဟုတ် Spam Folder) ကို စစ်ဆေးပါ။`
      );
    } catch (error) {
      Alert.alert('ပို့၍ မရပါ', error.message || 'Reset Email ပို့ရာတွင် အခက်အခဲရှိခဲ့ပါသည်။');
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (email && email.trim()) {
      Alert.alert(
        'စကားဝှက် မေ့နေပါသလား?',
        `${email.trim()} သို့ Password Reset Link ပို့မလား?`,
        [
          { text: 'မပို့ပါ', style: 'cancel' },
          {
            text: 'Link ပို့မည်',
            onPress: () => sendResetPasswordEmail(email.trim()),
          },
        ]
      );
      return;
    }

    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt(
        'စကားဝှက် မေ့နေပါသလား?',
        'Reset Link ပို့ရန် သင့် Email လိပ်စာကို ထည့်ပါ။',
        [
          { text: 'မလုပ်တော့ပါ', style: 'cancel' },
          {
            text: 'Link ပို့မည်',
            onPress: (inputEmail) => sendResetPasswordEmail(inputEmail),
          },
        ],
        'plain-text',
        email
      );
    } else {
      Alert.alert(
        'Email ထည့်သွင်းပါ',
        'အပေါ်က Email အကွက်ထဲတွင် သင့် Email လိပ်စာကို အရင်ရိုက်ထည့်ပြီး “စကားဝှက် မေ့နေပါသလား?” ကို ထပ်နှိပ်ပါ။'
      );
    }
  };

  const checkAppVersionUpdate = async () => {
    try {
      const { data, error } = await supabase
        .from('about')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      if (data.phone && String(data.phone).trim()) {
        setSupportPhone(String(data.phone).trim());
      }

      if (!data.version) return;

      if (isVersionNewer(data.version, currentVersion)) {
        const contactPhone = (data.phone && String(data.phone).trim()) || supportPhone;
        const messageText =
          `ဗားရှင်းအသစ် (${data.version}) ထွက်ရှိနေပါပြီ။ (လက်ရှိ: v${currentVersion})\n` +
          (data.release_notes ? `\nမှတ်ချက်: ${data.release_notes}\n` : '');

        const buttons = [];
        if (!data.force_update) {
          buttons.push({ text: 'နောက်မှ', style: 'cancel' });
        }
        if (data.updatelink) {
          buttons.push({
            text: 'Update လုပ်မည်',
            onPress: () => Linking.openURL(data.updatelink),
          });
        }

        Alert.alert('Version Update ရှိပါသည်', messageText, buttons, {
          cancelable: !data.force_update,
        });
      }
    } catch (err) {
      console.log('Version check error:', err.message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'ကျေးဇူးပြု၍ Email နှင့် Password ထည့်ပါ။');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

    } catch (error) {
      if (
        error.message.includes('Network request failed') || 
        error.message.includes('ConnectException') ||
        error.message.includes('Failed to connect')
      ) {
        Alert.alert(
          'အင်တာနက် အမှား (Connection Error)', 
          'အင်တာနက်လိုင်း မရှိပါ သို့မဟုတ် ဆာဗာသို့ ချိတ်ဆက်၍ မရပါ။ ကျေးဇူးပြု၍ Wi-Fi သို့မဟုတ် Mobile Data ကို စစ်ဆေးပြီး ပြန်ကြိုးစားပါ။'
        );
      } else {
        Alert.alert('Login ဝင်၍မရပါ', 'ထည့်သွင်းထားသော Email သို့မဟုတ် Password မှားယွင်းနေပါသည်။');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} 
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={styles.card}>
          <LanguageSwitcher style={{ alignSelf: 'flex-end', marginBottom: 8 }} />
          <Text style={styles.title}>KMO POS</Text>
          <Text style={styles.subtitle}>ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ</Text>

          <TextInput
            style={styles.input}
            placeholder="Email လိပ်စာ"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="စကားဝှက် (Password)"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(prev => !prev)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={handleForgotPassword}
            disabled={resetLoading}
          >
            <Text style={styles.forgotText}>
              {resetLoading ? 'Reset Link ပို့နေသည်...' : 'စကားဝှက် မေ့နေပါသလား?'}
            </Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 14 }} />
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>အကောင့်ဝင်မည်</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.phoneRow} onPress={handleCallSupport}>
            <Ionicons name="call" size={15} color="#007bff" style={{ marginRight: 5 }} />
            <Text style={styles.phoneLabel}>ဆက်သွယ်ရန်: </Text>
            <Text style={styles.phoneText}>Call Center</Text>
          </TouchableOpacity>

          <Text style={styles.copyrightText}>@ 2025 KMO POS. All rights reserved.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#f8f9fa', padding: 20 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 16, elevation: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    backgroundColor: '#fafafa', 
    padding: 14, 
    borderRadius: 8, 
    marginBottom: 15, 
    fontSize: 16,
    color: '#333'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 8,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 6,
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: '600',
  },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  phoneRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },
  phoneLabel: {
    fontSize: 13,
    color: '#666',
  },
  phoneText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  copyrightText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
});