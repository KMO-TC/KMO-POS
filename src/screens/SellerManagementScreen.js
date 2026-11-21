// src/screens/SellerManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import Modal from '../components/KeyboardAwareModal';
import { ResponsiveText as Text, LocalizedTextInput as TextInput } from '../components/ResponsiveText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { Alert } from '../components/LocalizedAlert';

const SUPABASE_URL = supabase.supabaseUrl;
const SUPABASE_ANON_KEY = supabase.supabaseKey;

const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export default function SellerManagementScreen({ navigation }) {
  const [sellers, setSellers] = useState([]);
  const [shopId, setShopId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // full_name အစား name ကို သုံးသည်

  useEffect(() => {
    fetchOwnerShopAndSellers();
  }, []);

  const fetchOwnerShopAndSellers = async () => {
    try {
      setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('shop_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      if (userData?.shop_id) {
        setShopId(userData.shop_id);
        await fetchSellers(userData.shop_id);
      }
    } catch (error) {
      console.error('Error fetching shop:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSellers = async (currentShopId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('shop_id', currentShopId)
        .eq('role', 'seller');

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error fetching sellers:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const handleCreateSeller = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'အမည်၊ အီးမေးလ်နှင့် လျှို့ဝှက်နံပါတ် အားလုံးထည့်သွင်းပါ။');
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert('လျှို့ဝှက်နံပါတ် တိုလွန်းသည်', 'လျှို့ဝှက်နံပါတ်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။');
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('အကောင့်ဖန်တီး၍ မရပါ။');

      // users ဇယားထဲတွင် name column သို့ သိမ်းဆည်းခြင်း
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email.trim(),
          name: name.trim(),
          role: 'seller',
          shop_id: shopId,
        });

      if (dbError) throw dbError;

      Alert.alert('အောင်မြင်သည်', 'Seller အကောင့်အသစ် ဖန်တီးပြီးပါပြီ။');
      setModalVisible(false);
      setEmail('');
      setPassword('');
      setName('');
      fetchSellers(shopId);

    } catch (error) {
      console.error('Error creating seller:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeller = (sellerId, sellerEmail) => {
    Alert.alert(
      'Seller ဖျက်ရန် သေချာပါသလား?',
      `"${sellerEmail}" ကို စာရင်းမှ ဖျက်လိုက်ပါမည်။`,
      [
        { text: 'ပယ်ဖျက်မည်', style: 'cancel' },
        { 
          text: 'ဖျက်မည်', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('users').delete().eq('id', sellerId);
              if (error) throw error;

              Alert.alert('အောင်မြင်သည်', 'Seller ကို ဖျက်ပြီးပါပြီ။');
              fetchSellers(shopId);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 10}}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>👥 အရောင်းဝန်ထမ်း (Seller) စီမံခန့်ခွဲမှု</Text>
            <Text style={styles.headerSubtitle}>စုစုပေါင်း Seller ဦးရေ ({sellers.length})</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>အသစ်</Text>
        </TouchableOpacity>
      </View>

      {/* Seller List */}
      <View style={styles.content}>
        <FlatList
          data={sellers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerName}>{item.name || 'အမည်မရှိ'}</Text>
                <Text style={styles.sellerEmail}>📧 {item.email}</Text>
              </View>

              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteSeller(item.id, item.email)}>
                <Ionicons name="trash-outline" size={20} color="#D0021B" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Seller စာရင်း မရှိသေးပါ။ "+ အသစ်" ကိုနှိပ်ပြီး ထည့်သွင်းပါ။</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchOwnerShopAndSellers}
        />
      </View>

      {/* Add Seller Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>👤 Seller အသစ် ထည့်သွင်းရန်</Text>
              
              <Text style={styles.label}>ဝန်ထမ်းအမည် (Name)</Text>
              <TextInput
                style={styles.input}
                placeholder="အမည်ထည့်ပါ"
                placeholderTextColor="#888"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>အီးမေးလ် (Email)</Text>
              <TextInput
                style={styles.input}
                placeholder="seller@shop.com"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>လျှို့ဝှက်နံပါတ် (Password)</Text>
              <TextInput
                style={styles.input}
                placeholder="အနည်းဆုံး ၆ လုံး ထည့်ပါ"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)} disabled={loading}>
                  <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleCreateSeller} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>ဖန်တီးမည်</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 3,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  addBtn: { flexDirection: 'row', backgroundColor: '#28a745', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
  content: { flex: 1, padding: 15 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  sellerName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  sellerEmail: { fontSize: 13, color: '#666' },
  deleteBtn: { padding: 8, backgroundColor: '#fff0f0', borderRadius: 8 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', maxHeight: '85%', backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 14, color: '#333', height: 42 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', height: 42, justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#e0e0e0', marginRight: 8 },
  cancelBtnText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  saveBtn: { backgroundColor: '#28a745', marginLeft: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});