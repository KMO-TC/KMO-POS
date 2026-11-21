// src/screens/ServicesReportScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Modal from '../components/KeyboardAwareModal';
import { ResponsiveText as Text, LocalizedTextInput as TextInput } from '../components/ResponsiveText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../config/supabase';
import { getCachedUserProfile, isNetworkError, loadServices, saveService, saveUserProfile } from '../services/offlineStore';
import { Alert } from '../components/LocalizedAlert';

const showMessage = (title, message) => {
  Alert.alert(title, message);
};

export default function ServicesReportScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [shopId, setShopId] = useState(null);
  const [filterType, setFilterType] = useState('daily'); // 'daily', 'monthly', 'yearly', 'custom'
  
  // Custom Date States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  // Picker visibility states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal States
  const [selectedService, setSelectedService] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Edit Form Fields
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDeviceModel, setEditDeviceModel] = useState('');
  const [editFault, setEditFault] = useState('');
  const [editServiceFee, setEditServiceFee] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    fetchOwnerShopAndServices();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredServices(services);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = services.filter(item => 
        (item.customer_name && item.customer_name.toLowerCase().includes(query)) ||
        (item.phone && item.phone.toLowerCase().includes(query)) ||
        (item.device_model && item.device_model.toLowerCase().includes(query)) ||
        (item.fault_description && item.fault_description.toLowerCase().includes(query)) ||
        (item.note && item.note.toLowerCase().includes(query))
      );
      setFilteredServices(filtered);
    }
  }, [searchQuery, services]);

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
        await fetchServicesData(userData.shop_id, filterType);
      }
    } catch (error) {
      console.error('Error fetching shop:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchServicesData = async (currentShopId, type) => {
    try {
      const data = await loadServices(currentShopId);

      const todayStr = new Date().toISOString().split('T')[0];

      const filtered = (data || []).filter(item => {
        const dateField = item.created_at;
        if (!dateField) return false;

        const itemDate = new Date(dateField);
        const now = new Date();

        if (type === 'daily') {
          return dateField.startsWith(todayStr);
        } else if (type === 'monthly') {
          return (
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear()
          );
        } else if (type === 'yearly') {
          return itemDate.getFullYear() === now.getFullYear();
        } else if (type === 'custom') {
          const itemDateOnly = dateField.split('T')[0];
          const startStr = startDate.toISOString().split('T')[0];
          const endStr = endDate.toISOString().split('T')[0];
          return itemDateOnly >= startStr && itemDateOnly <= endStr;
        }
        return true;
      });

      setServices(filtered);
      setFilteredServices(filtered);
    } catch (error) {
      console.error('Error fetching services report:', error.message);
      showMessage('Error', error.message);
    }
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    if (shopId) {
      fetchServicesData(shopId, type);
    }
  };

  const onChangeStartDate = (event, selectedDate) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) setStartDate(selectedDate);
  };

  const onChangeEndDate = (event, selectedDate) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) setEndDate(selectedDate);
  };

  const handleCustomFilterApply = () => {
    setFilterType('custom');
    if (shopId) fetchServicesData(shopId, 'custom');
  };

  // Card ကို နှိပ်လျှင် Edit Modal ဖွင့်ရန်
  const handleOpenEditModal = (item) => {
    setSelectedService(item);
    setEditCustomerName(item.customer_name || '');
    setEditPhone(item.phone || '');
    setEditDeviceModel(item.device_model || '');
    setEditFault(item.fault_description || '');
    setEditServiceFee(String(item.service_fee || ''));
    setEditCostPrice(String(item.cost_price || ''));
    setEditNote(item.note || '');
    setModalVisible(true);
  };

  // ပြင်ဆင်ချက်များကို Database သို့ သိမ်းဆည်းရန်
  const handleUpdateService = async () => {
    if (!selectedService) return;

    try {
      setUpdating(true);

      const fee = parseFloat(editServiceFee) || 0;
      const cost = parseFloat(editCostPrice) || 0;
      const profit = fee - cost; // အမြတ်ကို အလိုအလျောက် တွက်ချက်မည်
      const finalNote = editNote ? editNote.trim() : 'ဝန်ဆောင်မှုစာရင်း ပြင်ဆင်ထားသည်';

      const updatedService = await saveService({
        shop_id: shopId,
        customer_name: editCustomerName.trim(),
        phone: editPhone.trim(),
        device_model: editDeviceModel.trim(),
        fault_description: editFault.trim(),
        service_fee: fee,
        cost_price: cost,
        profit,
        note: finalNote,
      }, selectedService.id);

      showMessage(
        'အောင်မြင်သည် ✅',
        String(updatedService.id).startsWith('local-')
          ? 'Offline တွင် သိမ်းထားပြီး အင်တာနက်ရသည့်အခါ Sync လုပ်ပါမည်။'
          : 'ဝန်ဆောင်မှု အချက်အလက်များကို ပြင်ဆင်ပြီးပါပြီ။'
      );
      setModalVisible(false);
      await fetchServicesData(shopId, filterType);
    } catch (error) {
      showMessage('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const totalFee = services.reduce((sum, item) => sum + (parseFloat(item.service_fee) || 0), 0);
  const totalCost = services.reduce((sum, item) => sum + (parseFloat(item.cost_price) || 0), 0);
  const totalProfit = services.reduce((sum, item) => {
    const fee = parseFloat(item.service_fee) || 0;
    const cost = parseFloat(item.cost_price) || 0;
    const profitCol = parseFloat(item.profit);
    return sum + (!isNaN(profitCol) ? profitCol : (fee - cost));
  }, 0);

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
            <Text style={styles.headerTitle}>📊 ဝန်ဆောင်မှု အစီရင်ခံစာ (Services Report)</Text>
            <Text style={styles.headerSubtitle}>စုစုပေါင်း မှတ်တမ်း ({services.length} ခု)</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, filterType === 'daily' && styles.tabBtnActive]} onPress={() => handleFilterChange('daily')}>
          <Text style={[styles.tabText, filterType === 'daily' && styles.tabTextActive]}>နေ့အလိုက်</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, filterType === 'monthly' && styles.tabBtnActive]} onPress={() => handleFilterChange('monthly')}>
          <Text style={[styles.tabText, filterType === 'monthly' && styles.tabTextActive]}>လအလိုက်</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, filterType === 'yearly' && styles.tabBtnActive]} onPress={() => handleFilterChange('yearly')}>
          <Text style={[styles.tabText, filterType === 'yearly' && styles.tabTextActive]}>နှစ်အလိုက်</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, filterType === 'custom' && styles.tabBtnActive]} onPress={() => setFilterType('custom')}>
          <Text style={[styles.tabText, filterType === 'custom' && styles.tabTextActive]}>စိတ်ကြိုက်</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Date Range Picker UI */}
      {filterType === 'custom' && (
        <View style={styles.customDateContainer}>
          <View style={{flex: 1, marginRight: 4}}>
            <Text style={styles.dateLabel}>စတင်မည့်ရက်</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#007bff" style={{marginRight: 4}} />
              <Text style={styles.datePickerText}>{startDate.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
          </View>

          <View style={{flex: 1, marginHorizontal: 4}}>
            <Text style={styles.dateLabel}>ပြီးဆုံးမည့်ရက်</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#007bff" style={{marginRight: 4}} />
              <Text style={styles.datePickerText}>{endDate.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.filterApplyBtn} onPress={handleCustomFilterApply}>
            <Text style={styles.filterApplyText}>ရှာမည်</Text>
          </TouchableOpacity>
        </View>
      )}

      {showStartPicker && <DateTimePicker value={startDate} mode="date" display="default" onChange={onChangeStartDate} />}
      {showEndPicker && <DateTimePicker value={endDate} mode="date" display="default" onChange={onChangeEndDate} />}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="နာမည်၊ ဖုန်း၊ ပစ္စည်း၊ ပြစ်ချက် (သို့) မှတ်ချက်ဖြင့် ရှာရန်..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { borderLeftColor: '#007bff' }]}>
          <Text style={styles.summaryLabel}>စုစုပေါင်း ဝန်ဆောင်ခ (Services Fee)</Text>
          <Text style={[styles.summaryValue, { color: '#007bff' }]}>{totalFee.toLocaleString()} ကျပ်</Text>
        </View>

        <View style={styles.summaryHalfRow}>
          <View style={[styles.summaryCardHalf, { borderLeftColor: '#ff9800' }]}>
            <Text style={styles.summaryLabel}>စုစုပေါင်း အရင်း</Text>
            <Text style={[styles.summaryValueSmall, { color: '#ff9800' }]}>{totalCost.toLocaleString()} ကျပ်</Text>
          </View>

          <View style={[styles.summaryCardHalf, { borderLeftColor: '#28a745' }]}>
            <Text style={styles.summaryLabel}>ဝန်ဆောင်မှု အမြတ်စုစုပေါင်း</Text>
            <Text style={[styles.summaryValueSmall, { color: '#28a745' }]}>+ {totalProfit.toLocaleString()} ကျပ်</Text>
          </View>
        </View>
      </View>

      {/* Services List Report */}
      <View style={styles.content}>
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const fee = parseFloat(item.service_fee) || 0;
            const cost = parseFloat(item.cost_price) || 0;
            const profit = parseFloat(item.profit) || (fee - cost);
            const isEdited = !!item.note;

            return (
              <TouchableOpacity 
                style={[styles.card, isEdited && styles.editedCard]} 
                onPress={() => handleOpenEditModal(item)}
              >
                <View style={{flex: 1, paddingRight: 10}}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.customerName}>👤 {item.customer_name} ({item.phone || 'ဖုန်းမပါ'})</Text>
                    {isEdited && (
                      <View style={styles.editedBadge}>
                        <Text style={styles.editedBadgeText}>✏️ ပြင်ပြီး</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.deviceText}>📱 ပစ္စည်း: {item.device_model || 'မပါရှိ'}</Text>
                  <Text style={styles.faultText}>⚙️ ပြစ်ချက်: {item.fault_description || 'မပါရှိ'}</Text>
                  <Text style={styles.dateText}>🕒 {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</Text>
                  {isEdited && <Text style={styles.noteText}>📝 မှတ်ချက်: {item.note}</Text>}
                </View>

                <View style={{alignItems: 'flex-end'}}>
                  <Text style={styles.feeText}>{fee.toLocaleString()} ကျပ်</Text>
                  <Text style={styles.profitLabel}>အမြတ်</Text>
                  <Text style={styles.profitAmount}>+ {profit.toLocaleString()} ကျပ်</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ရှာဖွေတွေ့ရှိသော ဝန်ဆောင်မှု စာရင်း မရှိပါ။</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchOwnerShopAndServices}
        />
      </View>

      {/* Edit Service Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🛠️ ဝန်ဆောင်မှု မှတ်တမ်း ပြင်ဆင်ရန်</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight: 380}} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>ဖောက်သည်အမည်</Text>
              <TextInput style={styles.input} value={editCustomerName} onChangeText={setEditCustomerName} placeholder="နာမည်..." />

              <Text style={styles.label}>ဖုန်းနံပါတ်</Text>
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="ဖုန်းနံပါတ်..." keyboardType="phone-pad" />

              <Text style={styles.label}>ပစ္စည်းမော်ဒယ် (Device Model)</Text>
              <TextInput style={styles.input} value={editDeviceModel} onChangeText={setEditDeviceModel} placeholder="မော်ဒယ်..." />

              <Text style={styles.label}>ပြစ်ချက် / ပြဿနာ (Fault)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={editFault}
                onChangeText={setEditFault}
                placeholder="ဖြစ်ချက်..."
                multiline
              />

              <Text style={styles.label}>ဝန်ဆောင်ခ (Service Fee)</Text>
              <TextInput style={styles.input} value={editServiceFee} onChangeText={setEditServiceFee} placeholder="0" keyboardType="numeric" />

              <Text style={styles.label}>အရင်း (Cost Price)</Text>
              <TextInput style={styles.input} value={editCostPrice} onChangeText={setEditCostPrice} placeholder="0" keyboardType="numeric" />

              <Text style={styles.label}>ပြင်ဆင်ရသည့် အကြောင်းအရာ (Note)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="ဥပမာ - ဈေးနှုန်း အမှားပြင်ခြင်း..."
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)} disabled={updating}>
                <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleUpdateService} disabled={updating}>
                {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>သိမ်းမည်</Text>}
              </TouchableOpacity>
            </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 3,
    backgroundColor: '#f1f3f5',
  },
  tabBtnActive: { backgroundColor: '#007bff' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  tabTextActive: { color: '#fff' },
  customDateContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateLabel: { fontSize: 11, fontWeight: 'bold', color: '#555', marginBottom: 4 },
  datePickerBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    paddingHorizontal: 8,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerText: { fontSize: 12, color: '#333', fontWeight: 'bold' },
  filterApplyBtn: {
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 6,
  },
  filterApplyText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  summaryContainer: { padding: 15, paddingBottom: 5, paddingTop: 10 },
  summaryHalfRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 2,
    borderLeftWidth: 5,
  },
  summaryCardHalf: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 120,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 2,
    borderLeftWidth: 5,
    marginHorizontal: 2,
  },
  summaryLabel: { fontSize: 11, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  summaryValueSmall: { fontSize: 15, fontWeight: 'bold' },
  content: { flex: 1, padding: 15, paddingTop: 5 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  editedCard: {
    backgroundColor: '#fff8e1', 
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  editedBadge: {
    backgroundColor: '#ffecb3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  editedBadgeText: { fontSize: 9, fontWeight: 'bold', color: '#b78103' },
  customerName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  deviceText: { fontSize: 12, color: '#555', marginBottom: 2 },
  faultText: { fontSize: 11, color: '#666', marginBottom: 2 },
  dateText: { fontSize: 10, color: '#888', marginBottom: 2 },
  noteText: { fontSize: 11, color: '#856404', fontStyle: 'italic', marginTop: 2 },
  feeText: { fontSize: 13, fontWeight: 'bold', color: '#007bff', marginBottom: 2 },
  profitLabel: { fontSize: 10, color: '#28a745', fontWeight: 'bold' },
  profitAmount: { fontSize: 13, fontWeight: 'bold', color: '#28a745' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '92%', backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5, maxHeight: '85%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#444', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', padding: 10, borderRadius: 8, fontSize: 13, color: '#333', height: 42 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', height: 42, justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#e0e0e0', marginRight: 6 },
  cancelBtnText: { color: '#333', fontWeight: 'bold', fontSize: 13 },
  saveBtn: { backgroundColor: '#28a745', marginLeft: 6 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});