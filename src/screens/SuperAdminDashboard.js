// src/screens/SuperAdminDashboard.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Modal from '../components/KeyboardAwareModal';
import { ResponsiveText as Text, LocalizedTextInput as TextInput } from '../components/ResponsiveText';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { Alert } from '../components/LocalizedAlert';

export default function SuperAdminDashboard() {
  const [shops, setShops] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState(null);
  
  // Shop Form States
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // App Version / About States
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [aboutRecordId, setAboutRecordId] = useState(null);
  const [appVersion, setAppVersion] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [updateLink, setUpdateLink] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error('Error fetching shops:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const openAboutModal = async () => {
    setAboutModalVisible(true);
    setAboutLoading(true);
    try {
      const { data, error } = await supabase
        .from('about')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAboutRecordId(data.id);
        setAppVersion(data.version ? String(data.version) : '');
        setSupportPhone(data.phone ? String(data.phone) : '');
        setUpdateLink(data.updatelink ? String(data.updatelink) : '');
        setReleaseNotes(data.release_notes ? String(data.release_notes) : '');
        setForceUpdate(Boolean(data.force_update));
      } else {
        setAboutRecordId(null);
        setAppVersion('');
        setSupportPhone('');
        setUpdateLink('');
        setReleaseNotes('');
        setForceUpdate(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'About အချက်အလက်များ ဖတ်၍မရပါ။');
    } finally {
      setAboutLoading(false);
    }
  };

  const handleSaveAbout = async () => {
    if (!appVersion.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'Version နံပါတ် ထည့်သွင်းရန် လိုအပ်ပါသည်။');
      return;
    }

    setSavingAbout(true);
    try {
      const payload = {
        version: appVersion.trim(),
        phone: supportPhone.trim() || null,
        updatelink: updateLink.trim() || null,
        release_notes: releaseNotes.trim() || null,
        force_update: Boolean(forceUpdate),
      };

      if (aboutRecordId) {
        const { error } = await supabase
          .from('about')
          .update(payload)
          .eq('id', aboutRecordId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('about')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data?.id) setAboutRecordId(data.id);
      }

      Alert.alert('အောင်မြင်သည် ✅', 'App Version နှင့် Update အချက်အလက်များကို သိမ်းဆည်းပြီးပါပြီ။');
      setAboutModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'သိမ်းဆည်း၍ မရပါ။ RLS policy ကို စစ်ဆေးပါ။');
    } finally {
      setSavingAbout(false);
    }
  };

  const openModalForCreate = () => {
    setIsEditing(false);
    setSelectedShopId(null);
    setShopName('');
    setAddress('');
    setOwnerEmail('');
    setOwnerPassword('');
    setModalVisible(true);
  };

  const openModalForEdit = (item) => {
    setIsEditing(true);
    setSelectedShopId(item.id);
    setShopName(item.shop_name || '');
    setAddress(item.address || '');
    setOwnerEmail(item.owner_email || '');
    setOwnerPassword('');
    setModalVisible(true);
  };

  const handleSaveShop = async () => {
    if (!shopName.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'ဆိုင်အမည် ထည့်သွင်းရန် လိုအပ်ပါသည်။');
      return;
    }

    setLoading(true);
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();

      if (isEditing) {
        const { error: shopError } = await supabase
          .from('shops')
          .update({ 
            shop_name: shopName.trim(), 
            address: address.trim(),
            owner_email: ownerEmail.trim() 
          })
          .eq('id', selectedShopId);

        if (shopError) throw shopError;

        if (ownerEmail.trim()) {
          if (!ownerPassword.trim()) {
            Alert.alert('အချက်အလက် လိုအပ်သည်', 'Owner Email အသစ်ပြောင်းလဲရန် Password အသစ်ပါ ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။');
            setLoading(false);
            return;
          }

          const { data: oldUser } = await supabase
            .from('users')
            .select('id')
            .eq('shop_id', selectedShopId)
            .eq('role', 'Owner')
            .single();

          if (oldUser) {
            await supabase.from('users').delete().eq('id', oldUser.id);
          }

          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: ownerEmail.trim(),
            password: ownerPassword.trim(),
          });

          if (authError) throw authError;

          const newUserId = authData.user?.id;
          if (!newUserId) throw new Error('Owner အကောင့်သစ် ဖန်တီး၍ မရပါ။');

          if (adminSession) {
            await supabase.auth.setSession({
              access_token: adminSession.access_token,
              refresh_token: adminSession.refresh_token,
            });
          }

          const { error: userTableError } = await supabase.from('users').insert([{
            id: newUserId,
            email: ownerEmail.trim(),
            name: shopName.trim() + ' Owner',
            role: 'Owner',
            shop_id: selectedShopId
          }]);

          if (userTableError) throw userTableError;
        }

        Alert.alert('အောင်မြင်သည်', 'ဆိုင်အချက်အလက်နှင့် Owner အကောင့် ပြင်ဆင်ပြီးပါပြီ။');
      } else {
        if (!ownerEmail.trim() || !ownerPassword.trim()) {
          Alert.alert('အချက်အလက် လိုအပ်သည်', 'Owner Email နှင့် Password ထည့်သွင်းရန် လိုအပ်ပါသည်။');
          setLoading(false);
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: ownerEmail.trim(),
          password: ownerPassword.trim(),
        });

        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error('User ID ဖန်တီး၍ မရပါ။');

        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        }

        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .insert([{ 
            shop_name: shopName.trim(), 
            address: address.trim(),
            owner_email: ownerEmail.trim() 
          }])
          .select()
          .single();

        if (shopError) throw shopError;

        const { error: userTableError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            email: ownerEmail.trim(),
            name: shopName.trim() + ' Owner',
            role: 'Owner',
            shop_id: shopData.id
          }]);

        if (userTableError) throw userTableError;

        Alert.alert('အောင်မြင်သည်', 'ဆိုင်အသစ်နှင့် Owner အကောင့် ဖန်တီးပြီးပါပြီ။');
      }

      setModalVisible(false);
      fetchShops();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShop = (shopId, shopName) => {
    Alert.alert(
      'ဆိုင်ဖျက်ရန် သေချာပါသလား?',
      `"${shopName}" ကို ဖျက်လိုက်ပါက ဆိုင်နှင့်သက်ဆိုင်သော အချက်အလက်များပါ ပျက်သွားပါမည်။`,
      [
        { text: 'ပယ်ဖျက်မည်', style: 'cancel' },
        { 
          text: 'ဖျက်မည် (Delete)', 
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('users').delete().eq('shop_id', shopId);
              const { error } = await supabase.from('shops').delete().eq('id', shopId);
              if (error) throw error;

              Alert.alert('အောင်မြင်သည်', 'ဆိုင်ကို အောင်မြင်စွာ ဖျက်ပြီးပါပြီ။');
              fetchShops();
            } catch (error) {
              Alert.alert('Delete Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>👑 Admin Panel</Text>
          <Text style={styles.headerSubtitle}>ဆိုင်များနှင့် Owner များ စီမံခန့်ခွဲမှု</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.aboutBtn} 
            onPress={openAboutModal}
          >
            <Ionicons name="information-circle-outline" size={22} color="#fd7e14" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.refreshBtn} 
            onPress={fetchShops}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#007bff" />
            ) : (
              <Ionicons name="reload-outline" size={22} color="#007bff" />
            )}
          </TouchableOpacity>

          <LanguageSwitcher style={{ marginRight: 8 }} />
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#D0021B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ဆိုင်များ စာရင်း ({shops.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openModalForCreate}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>ဆိုင်အသစ်ထည့်မည်</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.shopCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{item.shop_name}</Text>
                <Text style={styles.shopDetail}>📍 လိပ်စာ: {item.address || 'မရှိပါ'}</Text>
                <Text style={styles.shopDetail}>
                  📧 Owner Email: <Text style={{fontWeight: 'bold', color: '#007bff'}}>{item.owner_email || 'Owner မရှိသေးပါ'}</Text>
                </Text>
                <Text style={styles.shopIdText} numberOfLines={1}>🆔 Shop ID: {item.id}</Text>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openModalForEdit(item)}>
                  <Ionicons name="create-outline" size={20} color="#007bff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteShop(item.id, item.shop_name)}>
                  <Ionicons name="trash-outline" size={20} color="#D0021B" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchShops}
        />
      </View>

      {/* Shop / Owner Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>
              {isEditing ? 'ဆိုင်နှင့် Owner အချက်အလက် ပြင်ဆင်ရန်' : 'ဆိုင်နှင့် Owner အသစ် ဖန်တီးရန်'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="ဆိုင်အမည် (Shop Name)"
              placeholderTextColor="#888"
              value={shopName}
              onChangeText={setShopName}
            />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="ဆိုင်လိပ်စာ (Address)"
              placeholderTextColor="#888"
              value={address}
              onChangeText={setAddress}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Owner Email အသစ်"
              placeholderTextColor="#888"
              value={ownerEmail}
              onChangeText={setOwnerEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder={isEditing ? "Password အသစ် (ပြောင်းလိုမှ ထည့်ရန်)" : "Owner ၏ Password"}
              placeholderTextColor="#888"
              value={ownerPassword}
              onChangeText={setOwnerPassword}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]} 
                onPress={handleSaveShop}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{isEditing ? 'ပြင်ဆင်မည်' : 'ဖန်တီးမည်'}</Text>
                )}
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* App Version & Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={aboutModalVisible}
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>📱 App Version & Update စီမံရန်</Text>

            {aboutLoading ? (
              <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }} />
            ) : (
              <>
                <Text style={styles.fieldLabel}>Latest Version (ဥပမာ - 1.0.2)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1.0.2"
                  placeholderTextColor="#888"
                  value={appVersion}
                  onChangeText={setAppVersion}
                />

                <Text style={styles.fieldLabel}>Support Phone (ဆက်သွယ်ရန် ဖုန်းနံပါတ်)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09-XXXXXXXXX"
                  placeholderTextColor="#888"
                  value={supportPhone}
                  onChangeText={setSupportPhone}
                  keyboardType="phone-pad"
                />

                <Text style={styles.fieldLabel}>Update Link (APK / Download URL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor="#888"
                  value={updateLink}
                  onChangeText={setUpdateLink}
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Release Notes (မှတ်ချက်)</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="ပြင်ဆင်ထားသော အချက်များ"
                  placeholderTextColor="#888"
                  value={releaseNotes}
                  onChangeText={setReleaseNotes}
                  multiline
                />

                <View style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>Force Update (မဖြစ်မနေ Update လုပ်ရန်)</Text>
                  <Switch value={forceUpdate} onValueChange={setForceUpdate} />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={() => setAboutModalVisible(false)}
                    disabled={savingAbout}
                  >
                    <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, styles.saveBtn]}
                    onPress={handleSaveAbout}
                    disabled={savingAbout}
                  >
                    {savingAbout ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>သိမ်းဆည်းမည်</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  aboutBtn: { padding: 8, borderRadius: 8, backgroundColor: '#fff4e6', marginRight: 8 },
  refreshBtn: { padding: 8, borderRadius: 8, backgroundColor: '#eef6ff', marginRight: 8 },
  logoutBtn: { padding: 8, borderRadius: 8, backgroundColor: '#fff0f0' },
  content: { flex: 1, padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  addBtn: { flexDirection: 'row', backgroundColor: '#007bff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4, fontSize: 13 },
  shopCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  shopName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  shopDetail: { fontSize: 13, color: '#555', marginTop: 2 },
  shopIdText: { fontSize: 11, color: '#999', marginTop: 4 },
  actionButtons: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  editBtn: { padding: 8, backgroundColor: '#eef6ff', borderRadius: 8, marginRight: 6 },
  deleteBtn: { padding: 8, backgroundColor: '#fff0f0', borderRadius: 8 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: 'bold', color: '#444', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 15, color: '#333' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#e0e0e0', marginRight: 8 },
  cancelBtnText: { color: '#333', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#007bff', marginLeft: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});