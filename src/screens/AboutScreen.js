// src/screens/ShopSettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Linking,
} from 'react-native';
import Modal from '../components/KeyboardAwareModal';
import { ResponsiveText as Text, LocalizedTextInput as TextInput } from '../components/ResponsiveText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { Alert } from '../components/LocalizedAlert';

const SUPABASE_URL = supabase.supabaseUrl;
const SUPABASE_ANON_KEY = supabase.supabaseKey;
const DEFAULT_SUPPORT_PHONE = '09-979747475';

const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

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

export default function ShopSettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [updatingShop, setUpdatingShop] = useState(false);
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [shopId, setShopId] = useState(null);
  const [ownerEmail, setOwnerEmail] = useState('');

  // Shop States
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // Sellers States
  const [sellers, setSellers] = useState([]);
  const [sellerModalVisible, setSellerModalVisible] = useState(false);
  const [sellerEmail, setSellerEmail] = useState('');
  const [sellerPassword, setSellerPassword] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [creatingSeller, setCreatingSeller] = useState(false);

  // About & Version Update States
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const [updateLink, setUpdateLink] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);

  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    fetchOwnerDataAndShop();
    fetchAboutInfo(false);
  }, []);

  const fetchAboutInfo = async (showAlertIfUpToDate = false) => {
    try {
      setCheckingUpdate(true);
      const { data, error } = await supabase
        .from('about')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.version) setLatestVersion(String(data.version).trim());
        if (data.updatelink) setUpdateLink(String(data.updatelink).trim());
        if (data.release_notes) setReleaseNotes(String(data.release_notes).trim());
        if (data.phone && String(data.phone).trim()) {
          setSupportPhone(String(data.phone).trim());
        }

        if (data.version && isVersionNewer(data.version, currentVersion)) {
          const contactPhone = (data.phone && String(data.phone).trim()) || supportPhone;
          const messageText =
            `ဗားရှင်းအသစ် (${data.version}) ထွက်ရှိနေပါပြီ။ (လက်ရှိ: v${currentVersion})\n` ;

          const buttons = [];
          if (!data.force_update) {
            buttons.push({ text: 'နောက်မှ', style: 'cancel' });
          }
          if (data.updatelink) {
            buttons.push({
              text: 'Update လုပ်မည်',
              onPress: () => Linking.openURL(String(data.updatelink).trim()),
            });
          }

          Alert.alert('Version Update ရှိပါသည်', messageText, buttons, {
            cancelable: !data.force_update,
          });
        } else if (showAlertIfUpToDate) {
          Alert.alert(
            'နောက်ဆုံး ဗားရှင်း ဖြစ်ပါသည် ✅',
            `လက်ရှိအသုံးပြုနေသော v${currentVersion} သည် နောက်ဆုံးဗားရှင်း ဖြစ်ပါသည်။`
          );
        }
      } else if (showAlertIfUpToDate) {
        Alert.alert(
          'နောက်ဆုံး ဗားရှင်း ဖြစ်ပါသည် ✅',
          `လက်ရှိအသုံးပြုနေသော v${currentVersion} သည် နောက်ဆုံးဗားရှင်း ဖြစ်ပါသည်။`
        );
      }
    } catch (error) {
      if (showAlertIfUpToDate) {
        Alert.alert('စစ်ဆေး၍ မရပါ', error.message || 'Update အချက်အလက် ရယူရာတွင် အခက်အခဲရှိခဲ့ပါသည်။');
      } else {
        console.log('Fetch about info error:', error.message);
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleCallSupport = async () => {
    const rawPhone = (supportPhone || DEFAULT_SUPPORT_PHONE).trim();
    const cleanedPhone = rawPhone.replace(/[^+\d]/g, '');

    if (!cleanedPhone) {
      Alert.alert('ဖုန်းနံပါတ် မရှိပါ', 'ဆက်သွယ်ရန် ဖုန်းနံပါတ် သတ်မှတ်ထားခြင်း မရှိပါ။');
      return;
    }

    try {
      await Linking.openURL(`tel:${cleanedPhone}`);
    } catch (err) {
      Alert.alert('ဖုန်းခေါ်၍ မရပါ', `ဖုန်းနံပါတ် ${rawPhone} သို့ ခေါ်ဆိုရန် အဆင်မပြေပါ။`);
    }
  };

  const fetchOwnerDataAndShop = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setOwnerEmail(user.email);

      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('shop_id')
        .eq('id', user.id)
        .single();

      if (userErr) throw userErr;

      if (userData?.shop_id) {
        setShopId(userData.shop_id);

        const { data: shopData, error: shopErr } = await supabase
          .from('shops')
          .select('*')
          .eq('id', userData.shop_id)
          .single();

        if (!shopErr && shopData) {
          setShopName(shopData.shop_name || shopData.name || '');
          setAddress(shopData.address || '');
          setPhone(shopData.phone !== null && shopData.phone !== undefined ? String(shopData.phone) : '');
        }

        await fetchSellers(userData.shop_id);
      }
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
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
    }
  };

  const handleUpdateShop = async () => {
    if (!shopName.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'ဆိုင်အမည် ဖြည့်သွင်းရန် လိုအပ်ပါသည်။');
      return;
    }

    try {
      setUpdatingShop(true);
      const { error } = await supabase
        .from('shops')
        .update({
          shop_name: shopName,
          shop_name: shopName,
          address: address,
          phone: phone,
        })
        .eq('id', shopId);

      if (error) throw error;
      Alert.alert('အောင်မြင်သည် ✅', 'ဆိုင်အချက်အလက်များကို ပြင်ဆင်ပြီးစီးပါပြီ။');
      setShopModalVisible(false);
      fetchOwnerDataAndShop();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdatingShop(false);
    }
  };

  const handleCreateSeller = async () => {
    if (!sellerEmail.trim() || !sellerPassword.trim() || !sellerName.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'အမည်၊ အီးမေးလ်နှင့် လျှို့ဝှက်နံပါတ် အားလုံးထည့်သွင်းပါ။');
      return;
    }

    if (sellerPassword.trim().length < 6) {
      Alert.alert('လျှို့ဝှက်နံပါတ် တိုလွန်းသည်', 'လျှို့ဝှက်နံပါတ်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။');
      return;
    }

    setCreatingSeller(true);
    try {
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: sellerEmail.trim(),
        password: sellerPassword.trim(),
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('အကောင့်ဖန်တီး၍ မရပါ။');

      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: sellerEmail.trim(),
          name: sellerName.trim(),
          role: 'seller',
          shop_id: shopId,
        });

      if (dbError) throw dbError;

      Alert.alert('အောင်မြင်သည်', 'Seller အကောင့်အသစ် ဖန်တီးပြီးပါပြီ။');
      setSellerModalVisible(false);
      setSellerEmail('');
      setSellerPassword('');
      setSellerName('');
      fetchSellers(shopId);

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setCreatingSeller(false);
    }
  };

  const handleDeleteSeller = (sellerId, sEmail) => {
    Alert.alert(
      'Seller ဖျက်ရန် သေချာပါသလား?',
      `"${sEmail}" ကို စာရင်းမှ ဖျက်လိုက်ပါမည်။`,
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

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{marginTop: 10, color: '#666'}}>အချက်အလက်များ ရယူနေသည်...</Text>
      </View>
    );
  }

  const hasNewUpdate = Boolean(latestVersion && isVersionNewer(latestVersion, currentVersion));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ ဆိုင်နှင့် ဝန်ထမ်း စီမံခန့်ခွဲမှု</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        
        {/* Section 1: Shop Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <View style={styles.iconCircle}>
                <Ionicons name="storefront" size={20} color="#007bff" />
              </View>
              <Text style={styles.cardTitle}>ဆိုင်အချက်အလက် </Text>
            </View>

            <TouchableOpacity style={styles.editBtn} onPress={() => setShopModalVisible(true)}>
              <Ionicons name="create-outline" size={15} color="#007bff" style={{marginRight: 4}} />
              <Text style={styles.editBtnText}>ပြင်ဆင်ရန်</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardSubtitle}>Receipt (ဘောက်ချာ) တွင် အလိုအလျောက် ပါဝင်မည့် ဆိုင်အချက်အလက်များ</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ဆိုင်အမည်:</Text>
            <Text style={styles.infoValue}>{shopName || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>လိပ်စာ:</Text>
            <Text style={styles.infoValue}>{address || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ဖုန်းနံပါတ်:</Text>
            <Text style={styles.infoValue}>{phone || '-'}</Text>
          </View>
          <View style={[styles.infoRow, {borderBottomWidth: 0}]}>
            <Text style={styles.infoLabel}>ပိုင်ရှင် အီးမေးလ်:</Text>
            <Text style={styles.infoValue}>{ownerEmail || '-'}</Text>
          </View>
        </View>

        {/* Section 2: Sellers Management Card */}
        <View style={[styles.card, {marginTop: 15}]}>
          <View style={[styles.cardHeaderRow, {justifyContent: 'space-between'}]}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={[styles.iconCircle, {backgroundColor: '#e6fcf5'}]}>
                <Ionicons name="people" size={20} color="#28a745" />
              </View>
              <Text style={styles.cardTitle}>အရောင်းဝန်ထမ်းများ ({sellers.length})</Text>
            </View>
            <TouchableOpacity style={styles.addSellerBtn} onPress={() => setSellerModalVisible(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addSellerBtnText}>အသစ်ထည့်ရန်</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSubtitle}>ဆိုင်တွင် အလုပ်လုပ်နေသော Seller အကောင့်များ</Text>

          {sellers.length === 0 ? (
            <Text style={styles.emptyText}>Seller စာရင်း မရှိသေးပါ။</Text>
          ) : (
            sellers.map((item) => (
              <View key={item.id} style={styles.sellerCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellerName}>{item.name || 'အမည်မရှိ'}</Text>
                  <Text style={styles.sellerEmail}>📧 {item.email}</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteSeller(item.id, item.email)}>
                  <Ionicons name="trash-outline" size={18} color="#D0021B" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Section 3: About App & Version Update Card */}
        <View style={[styles.card, {marginTop: 15}]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconCircle, {backgroundColor: '#fff4e6'}]}>
              <Ionicons name="information-circle" size={20} color="#fd7e14" />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.cardTitle}>ဆော့ဝဲအကြောင်း နှင့် Update</Text>
            </View>
            {hasNewUpdate && (
              <View style={styles.updateBadge}>
                <Text style={styles.updateBadgeText}>NEW</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardSubtitle}>လက်ရှိ ဗားရှင်းနှင့် ဗားရှင်းအသစ် ရှိမရှိ စစ်ဆေးရန်</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>လက်ရှိ ဗားရှင်း:</Text>
            <Text style={styles.infoValue}>v{currentVersion}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>နောက်ဆုံးထွက် ဗားရှင်း:</Text>
            <Text style={[styles.infoValue, hasNewUpdate && {color: '#28a745', fontWeight: 'bold'}]}>
              {latestVersion ? `v${latestVersion}` : '-'}
            </Text>
          </View>
          <TouchableOpacity style={styles.infoRow} onPress={handleCallSupport}>
            <Text style={styles.infoLabel}>ဆက်သွယ်ရန် ဖုန်း:</Text>
            <Text style={[styles.infoValue, {color: '#007bff', fontWeight: 'bold', textDecorationLine: 'underline'}]}>
              {supportPhone}
            </Text>
          </TouchableOpacity>
          {releaseNotes ? (
            <View style={[styles.infoRow, {borderBottomWidth: 0}]}>
              <Text style={styles.infoLabel}>မှတ်ချက်:</Text>
              <Text style={styles.infoValue}>{releaseNotes}</Text>
            </View>
          ) : null}

          <View style={{flexDirection: 'row', marginTop: 12}}>
            <TouchableOpacity
              style={[styles.checkUpdateBtn, {backgroundColor: '#007bff', flex: 1}]}
              onPress={() => fetchAboutInfo(true)}
              disabled={checkingUpdate}
            >
              {checkingUpdate ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={16} color="#fff" style={{marginRight: 6}} />
                  <Text style={styles.checkUpdateBtnText}>Update စစ်ဆေးမည်</Text>
                </>
              )}
            </TouchableOpacity>

            {hasNewUpdate && updateLink ? (
              <TouchableOpacity
                style={[styles.checkUpdateBtn, {backgroundColor: '#28a745', marginLeft: 8, paddingHorizontal: 14}]}
                onPress={() => Linking.openURL(updateLink)}
              >
                <Ionicons name="download-outline" size={16} color="#fff" style={{marginRight: 4}} />
                <Text style={styles.checkUpdateBtnText}>Download</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

      </ScrollView>

      {/* 1. Edit Shop Modal */}
      <Modal animationType="slide" transparent={true} visible={shopModalVisible} onRequestClose={() => setShopModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>🏪 ဆိုင်အချက်အလက် ပြင်ဆင်ရန်</Text>
            
            <Text style={styles.label}>ဆိုင်အမည် (Shop Name)</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="ဆိုင်အမည် ထည့်ပါ"
              placeholderTextColor="#888"
              value={shopName}
              onChangeText={setShopName}
            />

            <Text style={styles.label}>ဆိုင်လိပ်စာ (Shop Address)</Text>
            <TextInput
              style={[styles.inputModal, {height: 65, textAlignVertical: 'top'}]}
              placeholder="လိပ်စာ အပြည့်အစုံ"
              placeholderTextColor="#888"
              multiline
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.label}>ဖုန်းနံပါတ် (Phone Number)</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="ဖုန်းနံပါတ် ထည့်ပါ"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShopModalVisible(false)} disabled={updatingShop}>
                <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveModalBtn]} onPress={handleUpdateShop} disabled={updatingShop}>
                {updatingShop ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveModalBtnText}>သိမ်းမည်</Text>}
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Add Seller Modal */}
      <Modal animationType="slide" transparent={true} visible={sellerModalVisible} onRequestClose={() => setSellerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>👤 Seller အသစ် ထည့်သွင်းရန်</Text>
            
            <Text style={styles.label}>ဝန်ထမ်းအမည် (Name)</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="အမည်ထည့်ပါ"
              placeholderTextColor="#888"
              value={sellerName}
              onChangeText={setSellerName}
            />

            <Text style={styles.label}>အီးမေးလ် (Email)</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="seller@shop.com"
              placeholderTextColor="#888"
              value={sellerEmail}
              onChangeText={setSellerEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>လျှို့ဝှက်နံပါတ် (Password)</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="အနည်းဆုံး ၆ လုံး ထည့်ပါ"
              placeholderTextColor="#888"
              value={sellerPassword}
              onChangeText={setSellerPassword}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setSellerModalVisible(false)} disabled={creatingSeller}>
                <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveModalBtn]} onPress={handleCreateSeller} disabled={creatingSeller}>
                {creatingSeller ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveModalBtnText}>ဖန်တီးမည်</Text>}
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
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8' },
  header: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15, 
    paddingVertical: 12, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  scrollBody: { padding: 12, paddingBottom: 30 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#eaeaea',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e7f5ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  cardSubtitle: { fontSize: 11.5, color: '#666', marginBottom: 14, lineHeight: 16 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  infoLabel: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  infoValue: { fontSize: 12.5, color: '#333', maxWidth: '65%', textAlign: 'right' },

  editBtn: { flexDirection: 'row', backgroundColor: '#e7f5ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#74c0fc', alignItems: 'center' },
  editBtnText: { fontSize: 11, fontWeight: 'bold', color: '#007bff' },

  addSellerBtn: { flexDirection: 'row', backgroundColor: '#28a745', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  addSellerBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 3, fontSize: 11 },
  sellerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sellerName: { fontSize: 13.5, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  sellerEmail: { fontSize: 11.5, color: '#666' },
  deleteBtn: { padding: 6, backgroundColor: '#fff0f0', borderRadius: 6 },
  emptyText: { textAlign: 'center', color: '#888', marginVertical: 10, fontSize: 12.5 },

  updateBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  updateBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkUpdateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12.5,
  },
  
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 11.5, fontWeight: 'bold', color: '#444', marginBottom: 4, marginTop: 6 },
  inputModal: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 13, color: '#333', height: 40 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', height: 40, justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#e0e0e0', marginRight: 6 },
  cancelBtnText: { color: '#333', fontWeight: 'bold', fontSize: 13 },
  saveModalBtn: { backgroundColor: '#28a745', marginLeft: 6 },
  saveModalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});