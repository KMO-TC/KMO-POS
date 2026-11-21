// src/screens/ProfitScreen.js
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
import { Alert } from '../components/LocalizedAlert';

export default function ProfitScreen({ navigation }) {
  const [sales, setSales] = useState([]);
  const [shopId, setShopId] = useState(null);
  const [filterType, setFilterType] = useState('daily'); // 'daily', 'monthly', 'yearly', 'custom'
  
  // Custom Date States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  // Picker visibility states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit/Detail Modal States
  const [selectedSale, setSelectedSale] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [parsedItemsList, setParsedItemsList] = useState([]); 
  const [editNote, setEditNote] = useState(''); // ပြင်ဆင်ရသည့် အကြောင်းအရာ Note

  useEffect(() => {
    fetchOwnerShopAndSales();
  }, []);

  const fetchOwnerShopAndSales = async () => {
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
        await fetchSalesData(userData.shop_id, filterType);
      }
    } catch (error) {
      console.error('Error fetching shop:', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSalesData = async (currentShopId, type) => {
    try {
      const [salesRes, usersRes] = await Promise.all([
        supabase.from('sales').select('*').eq('shop_id', currentShopId).order('created_at', { ascending: false }),
        supabase.from('users').select('email, name').eq('shop_id', currentShopId)
      ]);

      if (salesRes.error) throw salesRes.error;

      const salesData = salesRes.data || [];
      const usersData = usersRes.data || [];

      const userMap = {};
      usersData.forEach(u => {
        if (u.email) userMap[u.email.toLowerCase()] = u.name;
      });

      const enrichedSales = salesData.map(item => {
        const email = (item.seller_email || '').toLowerCase();
        
        let displayItemName = '';
        let itemsArray = [];
        
        if (item.items) {
          let parsed = item.items;
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch (e) {}
          }
          if (Array.isArray(parsed) && parsed.length > 0) {
            itemsArray = parsed;
            displayItemName = parsed.map(i => `${i.name || i.item_name || 'Item'} (x${i.qty || i.quantity || 1})`).join(', ');
          }
        }

        return {
          ...item,
          seller_name: userMap[email] || item.seller_email || 'မသိရှိ',
          display_item_name: displayItemName || 'ပစ္စည်းမပါရှိ',
          parsed_items: itemsArray
        };
      });

      const todayStr = new Date().toISOString().split('T')[0];

      const filtered = enrichedSales.filter(item => {
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

      setSales(filtered);
    } catch (error) {
      console.error('Error fetching profit data:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    if (shopId) {
      fetchSalesData(shopId, type);
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
    if (shopId) fetchSalesData(shopId, 'custom');
  };

  // Card ကို နှိပ်သည့်အခါ Modal ဖွင့်ရန်
  const handleOpenEditModal = (item) => {
    setSelectedSale(item);
    setParsedItemsList(item.parsed_items ? JSON.parse(JSON.stringify(item.parsed_items)) : []);
    setEditNote(item.note || '');
    setModalVisible(true);
  };

  const handleIncreaseQty = (index) => {
    const updated = [...parsedItemsList];
    const currentQty = updated[index].qty || updated[index].quantity || 1;
    updated[index].qty = currentQty + 1;
    if (updated[index].quantity !== undefined) updated[index].quantity = currentQty + 1;
    setParsedItemsList(updated);
  };

  const handleDecreaseQty = (index) => {
    const updated = [...parsedItemsList];
    const currentQty = updated[index].qty || updated[index].quantity || 1;
    if (currentQty > 1) {
      updated[index].qty = currentQty - 1;
      if (updated[index].quantity !== undefined) updated[index].quantity = currentQty - 1;
      setParsedItemsList(updated);
    }
  };

  const handleDeleteItem = (index) => {
    Alert.alert('ပစ္စည်းဖျက်ရန်', 'ဤပစ္စည်းကို စာရင်းထဲမှ ဖျက်မှာ သေချာပါသလား?', [
      { text: 'မလုပ်ပါ။', style: 'cancel' },
      { 
        text: 'ဖျက်မည်', 
        style: 'destructive',
        onPress: () => {
          const updated = parsedItemsList.filter((_, i) => i !== index);
          setParsedItemsList(updated);
        }
      }
    ]);
  };

  // ပြင်ဆင်မှုများကို သိမ်းဆည်းခြင်း (Products Stock ပါ တစ်ပါတည်း ချိန်ညှိပေးမည်)
  const handleUpdateSale = async () => {
    if (!selectedSale) return;

    try {
      setUpdating(true);

      // 1. မူလဝယ်ယူခဲ့သော items ဟောင်းများနှင့် နှိုင်းယှဉ်ရန်
      const oldItems = selectedSale.parsed_items || [];
      const newItems = parsedItemsList;

      // 2. Products table ထဲက လက်ကျန် (stock) များကို ချိန်ညှိရန် စုဆောင်းခြင်း
      // တိုးသွားသော အရေအတွက်အတွက် stock နှုတ်မည်၊ လျော့သွား/ဖျက်လိုက်သော အရေအတွက်အတွက် stock ပြန်ပေါင်းထည့်မည်
      const stockChanges = {};

      // ဟောင်းများကို အခြေခံ၍ စစ်ဆေးမည် (ဖျက်လိုက်တာ သို့မဟုတ် လျော့သွားတာများအတွက် stock ပြန်ထည့်မည်)
      oldItems.forEach(oldItem => {
        const id = oldItem.id || oldItem.product_id;
        const name = oldItem.name || oldItem.item_name;
        const oldQty = oldItem.qty || oldItem.quantity || 1;

        // အသစ်ထဲမှာ ရှိမရှိ ရှာမည်
        const foundNew = newItems.find(ni => (ni.id && ni.id === id) || (ni.name && ni.name === name));
        const newQty = foundNew ? (foundNew.qty || foundNew.quantity || 1) : 0;

        const diff = oldQty - newQty; // > 0 ဆိုရင် လျော့သွားတာမို့ stock ပြန်ထည့်ရမယ်
        if (diff !== 0) {
          const key = id || name;
          stockChanges[key] = { id, name, qtyDiff: diff }; // diff က အပေါင်းဆိုရင် stock ပြန်တက်မယ်
        }
      });

      // အသစ်များကို အခြေခံ၍ စစ်ဆေးမည် (အသစ်တိုးလာတာများအတွက် stock နှုတ်မည်)
      newItems.forEach(newItem => {
        const id = newItem.id || newItem.product_id;
        const name = newItem.name || newItem.item_name;
        const newQty = newItem.qty || newItem.quantity || 1;

        const foundOld = oldItems.find(oi => (oi.id && oi.id === id) || (oi.name && oi.name === name));
        const oldQty = foundOld ? (foundOld.qty || foundOld.quantity || 1) : 0;

        if (!foundOld) {
          // ပစ္စည်းအသစ် ထည့်ထားတာဆိုရင် stock ထပ်နှုတ်ရမယ်
          const key = id || name;
          stockChanges[key] = { id, name, qtyDiff: -newQty };
        } else if (newQty > oldQty) {
          // အရေအတွက် တိုးလာတာဆိုရင် stock ထပ်နှုတ်ရမယ်
          const key = id || name;
          stockChanges[key] = { id, name, qtyDiff: -(newQty - oldQty) };
        }
      });

      // 3. Products table ထဲသို့ stock များကို တိုက်ဆိုင် update လုပ်ခြင်း
      for (const key in stockChanges) {
        const change = stockChanges[key];
        // product ကို name သို့မဟုတ် id ဖြင့် ရှာမည်
        let prodQuery = supabase.from('products').select('*').eq('shop_id', shopId);
        if (change.id) {
          prodQuery = prodQuery.eq('id', change.id);
        } else if (change.name) {
          prodQuery = prodQuery.eq('name', change.name);
        }

        const { data: prodData } = await prodQuery;
        if (prodData && prodData.length > 0) {
          const product = prodData[0];
          const currentStock = parseFloat(product.stock || product.quantity || 0);
          const updatedStock = currentStock + change.qtyDiff; // qtyDiff က stock ပြန်ထည့်ရင် အပေါင်း၊ နှုတ်ရင် အနှုတ်

          await supabase
            .from('products')
            .update({ 
              stock: updatedStock,
              quantity: updatedStock 
            })
            .eq('id', product.id);
        }
      }

      // 4. စုစုပေါင်းငွေနှင့် အမြတ်ငွေ အသစ်ပြန်တွက်ခြင်း
      let newTotalAmount = 0;
      let newTotalProfit = 0;

      newItems.forEach(pi => {
        const qty = pi.qty || pi.quantity || 1;
        const price = pi.price || pi.selling_price || 0;
        const cost = pi.cost || pi.cost_price || 0;
        
        newTotalAmount += price * qty;
        newTotalProfit += (price - cost) * qty;
      });

      if (newTotalProfit <= 0 && selectedSale.total_amount > 0) {
        const profitRatio = (parseFloat(selectedSale.total_profit) || 0) / parseFloat(selectedSale.total_amount);
        newTotalProfit = newTotalAmount * profitRatio;
      }

      // 5. Sales table ထဲသို့ items, total_amount နှင့် note ကို update လုပ်ခြင်း
      const finalNote = editNote ? editNote.trim() : 'ဘောက်ချာပြင်ဆင်ထားသည်';

      const { error } = await supabase
        .from('sales')
        .update({
          items: newItems,
          total_amount: newTotalAmount,
          total_profit: newTotalProfit,
          note: finalNote
        })
        .eq('id', selectedSale.id);

      if (error) throw error;

      Alert.alert('အောင်မြင်သည် ✅', 'ဘောက်ချာအချက်အလက်များနှင့် ပစ္စည်းလက်ကျန်များကို ပြင်ဆင်ပြီးပါပြီ။');
      setModalVisible(false);
      fetchSalesData(shopId, filterType);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const totalRevenue = sales.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
  const totalProfit = sales.reduce((sum, item) => sum + (parseFloat(item.total_profit) || 0), 0);

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
            <Text style={styles.headerTitle}>💰 အမြတ်အစွန်း စာရင်း (Profit & Loss)</Text>
            <Text style={styles.headerSubtitle}>အရောင်းအသွင် စုစုပေါင်း ({sales.length} ကြိမ်)</Text>
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

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { borderLeftColor: '#007bff' }]}>
          <Text style={styles.summaryLabel}>စုစုပေါင်း ရောင်းရငွေ (Revenue)</Text>
          <Text style={[styles.summaryValue, { color: '#007bff' }]}>{totalRevenue.toLocaleString()} ကျပ်</Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: '#28a745' }]}>
          <Text style={styles.summaryLabel}>စုစုပေါင်း အမြတ်ငွေ (Total Profit)</Text>
          <Text style={[styles.summaryValue, { color: '#28a745' }]}>{totalProfit.toLocaleString()} ကျပ်</Text>
        </View>
      </View>

      {/* Sales & Profit List */}
      <View style={styles.content}>
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const profit = parseFloat(item.total_profit) || 0;
            const amount = parseFloat(item.total_amount) || 0;
            const isEdited = !!item.note; // note ရှိလျှင် ပြင်ဆင်ပြီးသားဖြစ်ကြောင်း မှတ်သားမည်

            return (
              <TouchableOpacity 
                style={[styles.card, isEdited && styles.editedCard]} 
                onPress={() => handleOpenEditModal(item)}
              >
                <View style={{flex: 1, paddingRight: 10}}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.saleId}>ဘေလ်နံပါတ် #{index + 1}</Text>
                    {isEdited && (
                      <View style={styles.editedBadge}>
                        <Text style={styles.editedBadgeText}>✏️ ပြင်ပြီး</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.saleDate}>🕒 {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</Text>
                  <Text style={styles.saleDetail}>📦 ပစ္စည်း: {item.display_item_name}</Text>
                  <Text style={styles.sellerText}>👤 ရောင်းသူ: {item.seller_name}</Text>
                  {isEdited && <Text style={styles.noteText}>📝 မှတ်ချက်: {item.note}</Text>}
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={styles.amountText}>{amount.toLocaleString()} ကျပ်</Text>
                  <Text style={styles.profitLabel}>အမြတ်</Text>
                  <Text style={styles.profitAmount}>+ {profit.toLocaleString()} ကျပ်</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ဤကာလအတွက် အမြတ်စာရင်း မရှိသေးပါ။</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchOwnerShopAndSales}
        />
      </View>

      {/* Edit Sale Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🧾 ဘောက်ချာပစ္စည်းများ ပြင်ဆင်ရန်</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight: 380}} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionSubtitle}>ဝယ်ယူထားသော ပစ္စည်းစာရင်း (အရေအတွက် တိုး/လျော့ သို့ ဖျက်ရန်)</Text>
              
              {parsedItemsList.length > 0 ? (
                parsedItemsList.map((pi, index) => {
                  const qty = pi.qty || pi.quantity || 1;
                  const price = pi.price || pi.selling_price || 0;
                  return (
                    <View key={index} style={styles.editItemRow}>
                      <View style={{flex: 2}}>
                        <Text style={styles.itemNameText}>{pi.name || pi.item_name || 'Item'}</Text>
                        <Text style={styles.itemPriceText}>ဈေးနှုန်း: {price.toLocaleString()} ကျပ်</Text>
                      </View>

                      {/* Qty Controls */}
                      <View style={styles.qtyControlContainer}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleDecreaseQty(index)}>
                          <Ionicons name="remove" size={16} color="#333" />
                        </TouchableOpacity>
                        
                        <Text style={styles.qtyText}>{qty}</Text>

                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleIncreaseQty(index)}>
                          <Ionicons name="add" size={16} color="#333" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(index)}>
                          <Ionicons name="trash-outline" size={18} color="#dc3545" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noItemsText}>ပစ္စည်းစာရင်း မရှိတော့ပါ။</Text>
              )}

              <Text style={[styles.label, {marginTop: 12}]}>ပြင်ဆင်ရသည့် အကြောင်းအရာ (Note)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="ဥပမာ - ပစ္စည်းအမှားလဲလှယ်ခြင်း..."
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)} disabled={updating}>
                <Text style={styles.cancelBtnText}>ပယ်ဖျက်မည်</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleUpdateSale} disabled={updating}>
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
  summaryContainer: { padding: 15, paddingBottom: 5 },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 2,
    borderLeftWidth: 5,
  },
  summaryLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
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
    backgroundColor: '#fff8e1', // ပြင်ဆင်ပြီးသား Card များအတွက် အဝါနုရောင်နောက်ခံ
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
  saleId: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  saleDate: { fontSize: 11, color: '#666', marginBottom: 2 },
  saleDetail: { fontSize: 12, color: '#555', marginBottom: 2 },
  sellerText: { fontSize: 11, color: '#888', marginBottom: 2 },
  noteText: { fontSize: 11, color: '#856404', fontStyle: 'italic', marginTop: 2 },
  amountText: { fontSize: 14, fontWeight: 'bold', color: '#007bff', marginBottom: 2 },
  profitLabel: { fontSize: 10, color: '#28a745', fontWeight: 'bold' },
  profitAmount: { fontSize: 14, fontWeight: 'bold', color: '#28a745' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '92%', backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5, maxHeight: '85%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  sectionSubtitle: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 10 },
  editItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  itemNameText: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  itemPriceText: { fontSize: 11, color: '#666', marginTop: 2 },
  qtyControlContainer: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 28, height: 28, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
  qtyText: { marginHorizontal: 10, fontSize: 13, fontWeight: 'bold', color: '#333' },
  deleteBtn: { marginLeft: 10, padding: 4 },
  noItemsText: { fontSize: 12, color: '#888', fontStyle: 'italic', textAlign: 'center', marginVertical: 15 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#444', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', padding: 10, borderRadius: 8, fontSize: 13, color: '#333', height: 42 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', height: 42, justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#e0e0e0', marginRight: 6 },
  cancelBtnText: { color: '#333', fontWeight: 'bold', fontSize: 13 },
  saveBtn: { backgroundColor: '#28a745', marginLeft: 6 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});