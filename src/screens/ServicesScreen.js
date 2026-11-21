// src/screens/ServicesScreen.js
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
import { supabase } from '../config/supabase';
import { getCachedUserProfile, isNetworkError, loadServices, saveService, saveUserProfile, deleteService } from '../services/offlineStore';
import { Alert } from '../components/LocalizedAlert';

const showMessage = (title, message) => {
  Alert.alert(title, message);
};

export default function ServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [shopId, setShopId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State (Add / Edit)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);

  // Form Fields (သင့်ဇယားပါ Structure အတိုင်း)
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [devicesModel, setDevicesModel] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [servicesFee, setServicesFee] = useState('');
  const [costPrice, setCostPrice] = useState(''); // 👈 အရင်းငွေ အသစ်
  const [status, setStatus] = useState('Pending'); // 'Pending', 'In Progress', 'Completed'

  useEffect(() => {
    fetchOwnerShopAndServices();
  }, []);

  const fetchOwnerShopAndServices = async () => {
    try {
      setRefreshing(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = session?.user;
      if (!user) return;

      let userData;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('shop_id')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        userData = data;
        const cachedProfile = await getCachedUserProfile(user.id);
        await saveUserProfile(user.id, { ...cachedProfile, ...data });
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        userData = await getCachedUserProfile(user.id);
      }

      if (userData?.shop_id) {
        setShopId(userData.shop_id);
        await fetchServices(userData.shop_id);
      }
    } catch (error) {
      console.error('Error fetching shop:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchServices = async (currentShopId) => {
    try {
      setServices(await loadServices(currentShopId));
    } catch (error) {
      console.error('Error fetching services:', error.message);
      showMessage('Error', error.message);
    }
  };

  const handleOpenAddModal = () => {
    setEditingServiceId(null);
    setCustomerName('');
    setPhone('');
    setDevicesModel('');
    setFaultDescription('');
    setServicesFee('');
    setCostPrice('');
    setStatus('Pending');
    setModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingServiceId(item.id);
    setCustomerName(item.customer_name || '');
    setPhone(item.phone || '');
    setDevicesModel(item.device_model || '');
    setFaultDescription(item.fault_description || '');
    setServicesFee(item.service_fee ? item.service_fee.toString() : '');
    setCostPrice(item.cost_price ? item.cost_price.toString() : '');
    setStatus(item.status || 'Pending');
    setModalVisible(true);
  };

  const handleSaveService = async () => {
    if (!customerName.trim() || !servicesFee.trim()) {
      showMessage('အချက်အလက် လိုအပ်သည်', 'ဖောက်သည်အမည်နှင့် ဝန်ဆောင်ခ (Services Fee) ထည့်သွင်းပါ။');
      return;
    }

    const fee = parseFloat(servicesFee) || 0;
    const cost = parseFloat(costPrice) || 0;
    const profit = fee - cost; // 👈 အမြတ်ငွေ အလိုအလျောက် တွက်ချက်ခြင်း

    setLoading(true);
    try {
      const payload = {
        shop_id: shopId,
        customer_name: customerName.trim(),
        phone: phone.trim(),
        device_model: devicesModel.trim(),
        fault_description: faultDescription.trim(),
        service_fee: fee,
        cost_price: cost,
        profit: profit, // 👈 ဇယားထဲသို့ အမြတ်ငွေ ထည့်သွင်းခြင်း
        status: status,
      };

      const savedService = await saveService(payload, editingServiceId);
      setModalVisible(false);
      const savedOffline = String(savedService.id).startsWith('local-');
      const successMessage = editingServiceId
        ? 'ဝန်ဆောင်မှု အချက်အလက် ပြင်ဆင်ပြီးပါပြီ။'
        : 'ဝန်ဆောင်မှုအသစ် ထည့်သွင်းပြီးပါပြီ။';
      showMessage(
        savedOffline ? 'Offline' : 'အောင်မြင်သည်',
        savedOffline
          ? `${successMessage}\nစက်ထဲသိမ်းထားပြီး အင်တာနက်ရသည့်အခါ Sync လုပ်ပါမည်။`
          : successMessage
      );
      await fetchServices(shopId);

    } catch (error) {
      console.error('Error saving service:', error.message);
      showMessage('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = (serviceId, cName) => {
    const removeService = async () => {
      try {
        await deleteService(serviceId);
        showMessage('အောင်မြင်သည်', 'ဝန်ဆောင်မှု မှတ်တမ်းကို ဖျက်ပြီးပါပြီ။');
        await fetchServices(shopId);
      } catch (error) {
        showMessage('Error', error.message);
      }
    };
    const title = 'ဝန်ဆောင်မှု ဖျက်ရန် သေချာပါသလား?';
    const message = `"${cName}" ၏ ဝန်ဆောင်မှု မှတ်တမ်းကို ဖျက်လိုက်ပါမည်။`;

    Alert.alert(title, message, [
      { text: 'ပယ်ဖျက်မည်', style: 'cancel' },
      { text: 'ဖျက်မည်', style: 'destructive', onPress: removeService },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 10}}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>🛠️ ဝန်ဆောင်မှု စီမံခန့်ခွဲမှု (Services)</Text>
            <Text style={styles.headerSubtitle}>စုစုပေါင်း မှတ်တမ်း ({services.length} ခု)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>အသစ်</Text>
        </TouchableOpacity>
      </View>

      {/* Services List */}
      <View style={styles.content}>
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const fee = parseFloat(item.service_fee) || 0;
            const cost = parseFloat(item.cost_price) || 0;
            const profit = parseFloat(item.profit) || (fee - cost);

            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>👤 {item.customer_name} ({item.phone || 'ဖုန်းမပါ'})</Text>
                  <Text style={styles.deviceText}>📱 ပစ္စည်း: {item.device_model || 'မပါရှိ'}</Text>
                  <Text style={styles.faultText}>⚙️ ဖြစ်ချက်: {item.fault_description || 'မပါရှိ'}</Text>
                  
                  <View style={styles.moneyRow}>
                    <Text style={styles.feeText}>ဝန်ဆောင်ခ: {fee.toLocaleString()} ကျပ်</Text>
                    <Text style={styles.costText}>အရင်း: {cost.toLocaleString()} ကျပ်</Text>
                  </View>
                  <Text style={styles.profitText}>💰 အမြတ်ငွေ: + {profit.toLocaleString()} ကျပ်</Text>
                  
                  <Text style={styles.dateText}>🕒 {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</Text>
                </View>

                <View style={styles.actionBtns}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditModal(item)}>
                    <Ionicons name="create-outline" size={18} color="#007bff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteService(item.id, item.customer_name)}>
                    <Ionicons name="trash-outline" size={18} color="#D0021B" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ဝန်ဆောင်မှု စာရင်း မရှိသေးပါ။</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchOwnerShopAndServices}
        />
      </View>

      {/* Add / Edit Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {editingServiceId ? '🛠️ ဝန်ဆောင်မှု ပြင်ဆင်ရန်' : '🛠️ ဝန်ဆောင်မှု အသစ် ထည့်သွင်းရန်'}
              </Text>
              
              <Text style={styles.label}>ဖောက်သည်အမည် (Customer Name)</Text>
              <TextInput style={styles.input} placeholder="အမည်ထည့်ပါ" placeholderTextColor="#888" value={customerName} onChangeText={setCustomerName} />

              <Text style={styles.label}>ဖုန်းနံပါတ် (Phone)</Text>
              <TextInput style={styles.input} placeholder="ဖုန်းနံပါတ်" placeholderTextColor="#888" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

              <Text style={styles.label}>ပစ္စည်းအမျိုးအစား (Device Model)</Text>
              <TextInput style={styles.input} placeholder="ဥပမာ - iPhone 13 / Laptop" placeholderTextColor="#888" value={devicesModel} onChangeText={setDevicesModel} />

              <Text style={styles.label}>ပျက်စီးမှု အခြေအနေ (Fault Description)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="ဖန်သားပြင်ကွဲ / အင်ဂျင်လဲရန်"
                placeholderTextColor="#888"
                value={faultDescription}
                onChangeText={setFaultDescription}
                multiline
              />

              <Text style={styles.label}>ဝန်ဆောင်ခ (Services Fee - ကျပ်)</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#888" value={servicesFee} onChangeText={setServicesFee} keyboardType="numeric" />

              <Text style={styles.label}>အရင်းငွေ (Cost Price - ကျပ်)</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#888" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)} disabled={loading}>
                  <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveService} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>သိမ်းဆည်းမည်</Text>}
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
    flexWrap: 'wrap',
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 3,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  headerTitleContainer: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  addBtn: { flexDirection: 'row', backgroundColor: '#28a745', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center', minHeight: 40 },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
  content: { flex: 1, padding: 15 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  customerName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  deviceText: { fontSize: 13, color: '#555', marginBottom: 2 },
  faultText: { fontSize: 12, color: '#666', marginBottom: 4 },
  moneyRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 4 },
  feeText: { fontSize: 12, fontWeight: 'bold', color: '#007bff', marginRight: 12 },
  costText: { fontSize: 12, fontWeight: 'bold', color: '#ff9800' },
  profitText: { fontSize: 13, fontWeight: 'bold', color: '#28a745', marginBottom: 4 },
  dateText: { fontSize: 11, color: '#888' },
  actionBtns: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: 6 },
  editBtn: { padding: 8, backgroundColor: '#e7f1ff', borderRadius: 8, marginRight: 6 },
  deleteBtn: { padding: 8, backgroundColor: '#fff0f0', borderRadius: 8 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '92%', maxWidth: 520, maxHeight: '85%', backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5 },
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