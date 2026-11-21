// src/screens/ProductInventoryScreen.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { printHtmlDocument } from '../services/printService';
import {
  getCachedUserProfile,
  isNetworkError,
  loadProducts,
  saveProduct,
  saveUserProfile,
  syncPendingChanges,
  deleteProduct as removeProduct,
} from '../services/offlineStore';
import { Alert } from '../components/LocalizedAlert';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export default function ProductInventoryScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [categories, setCategories] = useState([]);     
  const [groupNames, setGroupNames] = useState([]);     
  const [shopId, setShopId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States (Add/Edit Product)
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);

  // ရှိပြီးသား ပစ္စည်းကို Suggestion မှ ရွေးချယ်ထားခြင်း (Restock Mode)
  const [selectedExistingProduct, setSelectedExistingProduct] = useState(null);

  // Action Modal States (Card ကို နှိပ်သည့်အခါ ပေါ်လာမည့် Menu)
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  // Picker Modal States
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerType, setPickerType] = useState('category'); // 'category', 'group', 'percent_category'

  // Percentage Price Update Modal States
  const [percentModalVisible, setPercentModalVisible] = useState(false);
  const [markupPercent, setMarkupPercent] = useState('');
  const [targetType, setTargetType] = useState('all'); // 'all', 'category'
  const [selectedTargetCategory, setSelectedTargetCategory] = useState('');

  // Form States
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [stock, setStock] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [price, setPrice] = useState('');

  // ပစ္စည်းအမည် ရိုက်ထည့်နေစဉ် တူနိုင်ခြေရှိသော ပစ္စည်းများကို ရှာဖွေပြသရန်
  const nameSuggestions = useMemo(() => {
    if (isEditing || selectedExistingProduct || !name.trim()) return [];
    const query = name.trim().toLowerCase();
    return products
      .filter((item) => item.name && item.name.toLowerCase().includes(query))
      .slice(0, 5); // အများဆုံး ၅ ခုအထိ ပြပေးမည်
  }, [name, products, isEditing, selectedExistingProduct]);

  const fetchProducts = useCallback(async (currentShopId) => {
    try {
      const data = await loadProducts(currentShopId);
      setProducts(data);

      const uniqueCats = [...new Set(data.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCats);

      const uniqueGroups = [...new Set(data.map(item => item.group_name).filter(Boolean))];
      setGroupNames(uniqueGroups);
      syncPendingChanges().catch((error) => {
        console.error('Product changes are still waiting to sync:', error);
      });

    } catch (error) {
      console.error('Error fetching products:', error.message);
      Alert.alert('Error', error.message);
    }
  }, []);

  const fetchOwnerShopAndProducts = useCallback(async () => {
    try {
      setRefreshing(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      let userData;
      const { data, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        if (!isNetworkError(userError)) throw userError;
        userData = await getCachedUserProfile(user.id);
      } else {
        userData = data;
        await saveUserProfile(user.id, data);
      }

      if (userData?.shop_id) {
        setShopId(userData.shop_id);
        await fetchProducts(userData.shop_id);
      }
    } catch (error) {
      console.error('Error fetching shop:', error.message);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProducts]);

  useEffect(() => {
    Promise.resolve().then(fetchOwnerShopAndProducts);
  }, [fetchOwnerShopAndProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((item) =>
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.group_name && item.group_name.toLowerCase().includes(query))
    );
  }, [searchQuery, products]);

  const totalCostValue = products.reduce((sum, item) => sum + ((parseFloat(item.cost_price) || 0) * (parseInt(item.stock) || 0)), 0);
  const totalSellingValue = products.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.stock) || 0)), 0);

  const openModalForCreate = () => {
    setIsEditing(false);
    setSelectedProductId(null);
    setSelectedExistingProduct(null);
    setName('');
    setSelectedCategory(categories.length > 0 ? categories[0] : '');
    setSelectedGroup(groupNames.length > 0 ? groupNames[0] : '');
    setStock('');
    setCostPrice('');
    setPrice('');
    setModalVisible(true);
  };

  const openModalForEdit = (item) => {
    setIsEditing(true);
    setSelectedProductId(item.id);
    setSelectedExistingProduct(null);
    setName(item.name || '');
    setSelectedCategory(item.category || '');
    setSelectedGroup(item.group_name || '');
    setStock(String(item.stock ?? ''));
    setCostPrice(String(item.cost_price ?? ''));
    setPrice(String(item.price ?? ''));
    setModalVisible(true);
  };

  // Suggestion ထဲမှ ရှိပြီးသား ပစ္စည်းကို နှိပ်ရွေးလိုက်သည့်အခါ
  const handleSelectSuggestion = (item) => {
    setSelectedExistingProduct(item);
    setName(item.name || '');
    setSelectedCategory(item.category || '');
    setSelectedGroup(item.group_name || '');
    setStock(''); // ထပ်ထည့်မည့် Stock အရေအတွက် ရိုက်ရန် အလွတ်ထားမည်
    setCostPrice(String(item.cost_price ?? ''));
    setPrice(String(item.price ?? ''));
  };

  // ရွေးထားသော ရှိပြီးသားပစ္စည်းကို ပြန်ဖြုတ်ပြီး အသစ်အဖြစ် ပြန်ပြောင်းရန်
  const handleClearSelectedExisting = () => {
    setSelectedExistingProduct(null);
  };

  const handleSaveProduct = async () => {
    if (!name.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'ပစ္စည်းအမည် ထည့်သွင်းရန် လိုအပ်ပါသည်။');
      return;
    }

    // ရှိပြီးသားပစ္စည်းကို Suggestion မှ ရွေးထားပါက Stock ပေါင်းပြီး Update လုပ်မည်
    if (!isEditing && selectedExistingProduct) {
      const addedStock = parseInt(stock, 10) || 0;
      if (addedStock <= 0) {
        Alert.alert('အချက်အလက် လိုအပ်သည်', 'ထပ်ဖြည့်မည့် Stock အရေအတွက်ကို 0 ထက်ကြီးသော နံပါတ်ထည့်ပါ။');
        return;
      }

      const currentStock = parseInt(selectedExistingProduct.stock, 10) || 0;
      const updatedStock = currentStock + addedStock;

      const updatedCostPrice =
        costPrice.trim() !== '' && !isNaN(parseFloat(costPrice))
          ? parseFloat(costPrice)
          : (parseFloat(selectedExistingProduct.cost_price) || 0);

      const updatedSellingPrice =
        price.trim() !== '' && !isNaN(parseFloat(price))
          ? parseFloat(price)
          : (parseFloat(selectedExistingProduct.price) || 0);

      setLoading(true);
      try {
        await saveProduct({
            name: name.trim(),
            category: selectedCategory.trim(),
            group_name: selectedGroup.trim(),
            shop_id: shopId,
            stock: updatedStock,
            cost_price: updatedCostPrice,
            price: updatedSellingPrice,
          }, selectedExistingProduct.id);

        Alert.alert(
          'အောင်မြင်သည်',
          `"${selectedExistingProduct.name}" ၏ လက်ကျန်ကို ${currentStock} မှ ${updatedStock} သို့ ပေါင်းထည့်ပြီးပါပြီ။`
        );
        setModalVisible(false);
        setSelectedExistingProduct(null);
        await fetchProducts(shopId);
      } catch (error) {
        console.error('Error updating existing product:', error.message);
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!price.trim()) {
      Alert.alert('အချက်အလက် လိုအပ်သည်', 'ပစ္စည်းအမည်နှင့် ရောင်းဈေး ထည့်သွင်းရန် လိုအပ်ပါသည်။');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        shop_id: shopId,
        name: name.trim(),
        category: selectedCategory.trim(),
        group_name: selectedGroup.trim(),
        stock: parseInt(stock, 10) || 0,
        cost_price: parseFloat(costPrice) || 0,
        price: parseFloat(price) || 0,
      };

      if (isEditing) {
        await saveProduct(productData, selectedProductId);
        Alert.alert('အောင်မြင်သည်', 'ပစ္စည်းအချက်အလက် ပြင်ဆင်ပြီးပါပြီ။');
      } else {
        await saveProduct(productData);
        Alert.alert('အောင်မြင်သည်', 'ပစ္စည်းအသစ် ထည့်သွင်းပြီးပါပြီ။');
      }

      setModalVisible(false);
      await fetchProducts(shopId);
    } catch (error) {
      console.error('Error saving product:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPercentagePrice = async () => {
    const percent = parseFloat(markupPercent);
    if (isNaN(percent) || percent <= 0) {
      Alert.alert('မှားယွင်းနေသည်', 'မှန်ကန်သော ရာခိုင်နှုန်း (%) ထည့်သွင်းပါ။');
      return;
    }

    Alert.alert(
      'စျေးနှုန်း အပြောင်းအလဲလုပ်ရန် သေချာပါသလား?',
      `သတ်မှတ်ထားသော ပစ္စည်းများ၏ ရောင်းစျေးများကို ${percent}% မြှင့်တင်မည်။`,
      [
        { text: 'ပယ်ဖျက်မည်', style: 'cancel' },
        {
          text: 'အတည်ပြုမည်',
          onPress: async () => {
            setLoading(true);
            try {
              let targetProducts = await loadProducts(shopId);
              if (targetType === 'category' && selectedTargetCategory) {
                targetProducts = targetProducts.filter((item) => item.category === selectedTargetCategory);
              }

              for (let item of targetProducts) {
                const currentPrice = parseFloat(item.price) || 0;
                const newPrice = Math.round(currentPrice + (currentPrice * (percent / 100)));

                const { id, ...productData } = item;
                await saveProduct({ ...productData, price: newPrice }, id);
              }

              Alert.alert('အောင်မြင်သည်', 'ရောင်းစျေးများကို ရာခိုင်နှုန်းအလိုက် အောင်မြင်စွာ အပ်ဒိတ်လုပ်ပြီးပါပြီ။');
              setPercentModalVisible(false);
              setMarkupPercent('');
              fetchProducts(shopId);
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteProduct = (productId, productName) => {
    Alert.alert(
      'ပစ္စည်းဖျက်ရန် သေချာပါသလား?',
      `"${productName}" ကို စာရင်းမှ ဖျက်လိုက်ပါမည်။`,
      [
        { text: 'ပယ်ဖျက်မည်', style: 'cancel' },
        { 
          text: 'ဖျက်မည်', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeProduct(productId);

              Alert.alert('အောင်မြင်သည်', 'ပစ္စည်းကို ဖျက်ပြီးပါပြီ။');
              fetchProducts(shopId);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handlePrintInventory = async () => {
    try {
      const rows = products.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category || '-')}</td>
          <td>${escapeHtml(item.group_name || '-')}</td>
          <td class="number">${Number(item.stock) || 0}</td>
          <td class="number">${(Number(item.cost_price) || 0).toLocaleString()}</td>
          <td class="number">${(Number(item.price) || 0).toLocaleString()}</td>
        </tr>
      `).join('');
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              @page { size: landscape; margin: 10mm; }
              body { font-family: Arial, sans-serif; padding: 12px; color: #222; }
              h1 { font-size: 20px; margin-bottom: 4px; }
              p { color: #666; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: auto; }
              th, td { border: 1px solid #bbb; padding: 6px 4px; text-align: left; overflow-wrap: anywhere; }
              th { background: #f0f3f8; }
              .number { text-align: right; white-space: nowrap; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>ပစ္စည်းစာရင်း</h1>
            <p>ထုတ်ယူချိန်: ${escapeHtml(new Date().toLocaleString())} · အမျိုးအစား ${products.length} မျိုး</p>
            <table>
              <thead><tr><th>စဉ်</th><th>ပစ္စည်းအမည်</th><th>အမျိုးအစား</th><th>အုပ်စု</th><th>လက်ကျန်</th><th>ဝယ်ဈေး (ကျပ်)</th><th>ရောင်းဈေး (ကျပ်)</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="7">ပစ္စည်းမရှိပါ</td></tr>'}</tbody>
            </table>
          </body>
        </html>
      `;
      await printHtmlDocument(html);
    } catch (error) {
      console.error('Error printing inventory:', error);
      const message = error.message || 'ပစ္စည်းစာရင်း ပရင့်ထုတ်၍ မရပါ။';
      Alert.alert('Print Error', message);
    }
  };

  const handlePrintBarcode = async (item) => {
    try {
      let BluetoothEscposPrinter;
      try {
        const printerModule = require('react-native-bluetooth-escpos-printer');
        BluetoothEscposPrinter = printerModule.BluetoothEscposPrinter;
      } catch (e) {
        Alert.alert('Printer မော်ဂျူး မရှိပါ', 'Bluetooth Printer မော်ဂျူး တပ်ဆင်ထားခြင်း မရှိသေးပါ။');
        return;
      }

      if (!BluetoothEscposPrinter) {
        Alert.alert('Error', 'Bluetooth Printer ကို ချိတ်ဆက်၍ မရပါ။');
        return;
      }

      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      
      await BluetoothEscposPrinter.printText(`${item.name}\n`, { bold: 1 });
      await BluetoothEscposPrinter.printText(`ဈေးနှုန်း: ${item.price} ကျပ်\n`, {});
      
      const productIdStr = String(item.id);
      await BluetoothEscposPrinter.printBarCode(
        productIdStr, 
        BluetoothEscposPrinter.BARCODE.CODE128, 
        60, 
        3,  
        BluetoothEscposPrinter.BARCODE_ALIGN.CENTER
      );

      await BluetoothEscposPrinter.printText(`\nID: ${productIdStr}\n\n\n`, {});
      Alert.alert('အောင်မြင်သည်', 'Barcode ဘားကုဒ် ပရင့်ထုတ်ပြီးပါပြီ။');
    } catch (error) {
      console.log('Barcode Print Error:', error);
      Alert.alert('Print Error', 'ပရင်တာ ချိတ်ဆက်မှု စစ်ဆေးပါ။');
    }
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
            <Text style={styles.headerTitle}>📦 ပစ္စည်းစာရင်း</Text>
            <Text style={styles.headerSubtitle}>    စုစုပေါင်း အမျိုးအစား ({products.length})</Text>
          </View>
        </View>

        <View style={styles.headerActionBtns}>
          <TouchableOpacity style={styles.printListBtn} onPress={handlePrintInventory}>
            <Ionicons name="print-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.percentBtn} onPress={() => { setSelectedTargetCategory(categories[0] || ''); setPercentModalVisible(true); }}>
            <MaterialCommunityIcons name="percent" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openModalForCreate}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>အသစ်</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ပစ္စည်းအမည်၊ အမျိုးအစားဖြင့် ရှာရန်..."
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

      {/* Total Inventory Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>စုစုပေါင်း ဝယ်တန်ဖိုး</Text>
          <Text style={[styles.summaryValue, { color: '#d84315' }]}>{totalCostValue.toLocaleString()} ကျပ်</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>စုစုပေါင်း ရောင်းတန်ဖိုး</Text>
          <Text style={[styles.summaryValue, { color: '#007bff' }]}>{totalSellingValue.toLocaleString()} ကျပ်</Text>
        </View>
      </View>

      {/* Product List */}
      <View style={styles.content}>
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => {
                setActiveProduct(item);
                setActionModalVisible(true);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>📦 {item.name}</Text>
                <Text style={styles.productCategory}>
                  🏷️ {item.category || 'မရှိပါ'} {item.group_name ? `(${item.group_name})` : ''}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>💰 ရောင်းဈေး: {item.price} ကျပ်</Text>
                  <Text style={[styles.qtyText, item.stock <= 5 && { color: '#e53935' }]}>
                    📦 လက်ကျန်: {item.stock} ခု
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" style={{marginLeft: 8}} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ရှာဖွေတွေ့ရှိသော ပစ္စည်း မရှိပါ။</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={fetchOwnerShopAndProducts}
        />
      </View>

      {/* Action Modal */}
      <Modal animationType="fade" transparent={true} visible={actionModalVisible} onRequestClose={() => setActionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '80%', padding: 15 }]}>
            <Text style={[styles.modalTitle, { fontSize: 16, marginBottom: 10 }]} numberOfLines={1}>
              {activeProduct?.name}
            </Text>
            
            <TouchableOpacity 
              style={styles.actionMenuBtn} 
              onPress={() => {
                setActionModalVisible(false);
                openModalForEdit(activeProduct);
              }}
            >
              <Ionicons name="create-outline" size={20} color="#007bff" style={{marginRight: 10}} />
              <Text style={{fontSize: 14, fontWeight: 'bold', color: '#007bff'}}>ပြင်ဆင်ရန် (Edit)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionMenuBtn} 
              onPress={() => {
                setActionModalVisible(false);
                handlePrintBarcode(activeProduct);
              }}
            >
              <Ionicons name="barcode-outline" size={20} color="#28a745" style={{marginRight: 10}} />
              <Text style={{fontSize: 14, fontWeight: 'bold', color: '#28a745'}}>Barcode ထုတ်ရန် (Print)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionMenuBtn} 
              onPress={() => {
                setActionModalVisible(false);
                handleDeleteProduct(activeProduct.id, activeProduct.name);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#D0021B" style={{marginRight: 10}} />
              <Text style={{fontSize: 14, fontWeight: 'bold', color: '#D0021B'}}>ဖျက်ရန် (Delete)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalBtn, styles.cancelBtn, { marginTop: 15, width: '100%' }]} 
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>ပိတ်မည်</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Product Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={{width: '100%'}} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {isEditing
                  ? 'ပစ္စည်းအချက်အလက် ပြင်ဆင်ရန်'
                  : selectedExistingProduct
                    ? 'ရှိပြီးသားပစ္စည်း Stock ထပ်ဖြည့်ရန်'
                    : 'ပစ္စည်းအသစ် ထည့်သွင်းရန်'}
              </Text>
              
              <Text style={styles.label}>ပစ္စည်းအမည် (Product Name)</Text>
              <TextInput
                style={styles.input}
                placeholder="ပစ္စည်းအမည် ထည့်ပါ (ရှိပြီးသားရှာရန် စာရိုက်ပါ)"
                placeholderTextColor="#888"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  // ရွေးထားတဲ့ ရှိပြီးသားပစ္စည်းရဲ့ နာမည်ကို ပြင်ရိုက်လိုက်ပါက အသစ် Mode ပြန်ပြောင်းမည်
                  if (
                    selectedExistingProduct &&
                    text.trim().toLowerCase() !== selectedExistingProduct.name?.trim().toLowerCase()
                  ) {
                    setSelectedExistingProduct(null);
                  }
                }}
              />

              {/* စာရိုက်နေစဉ် တူနိုင်ခြေရှိသော ပစ္စည်းစာရင်း (Autocomplete Suggestions) */}
              {!isEditing && !selectedExistingProduct && nameSuggestions.length > 0 && (
                <View style={styles.suggestionBox}>
                  <Text style={styles.suggestionHeader}>
                    🔍 ရှိပြီးသား ပစ္စည်းများ (Stock ထပ်ဖြည့်လိုပါက နှိပ်ရွေးပါ)
                  </Text>
                  {nameSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionName}>{item.name}</Text>
                        <Text style={styles.suggestionMeta}>
                          {item.category || 'မရှိပါ'} {item.group_name ? `(${item.group_name})` : ''} • ရောင်းဈေး: {item.price} ကျပ်
                        </Text>
                      </View>
                      <View style={styles.suggestionStockBadge}>
                        <Text style={styles.suggestionStockText}>လက်ကျန်: {item.stock || 0}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Suggestion မှ ရှိပြီးသားပစ္စည်းကို ရွေးချယ်ထားသည့်အခါ ပြမည့် Banner */}
              {!isEditing && selectedExistingProduct && (
                <View style={styles.selectedExistingBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedExistingTitle}>
                      {'📦 "'}{selectedExistingProduct.name}{'" ထဲသို့ Stock ထပ်ပေါင်းမည်'}
                    </Text>
                    <Text style={styles.selectedExistingSub}>
                      လက်ရှိလက်ကျန်: {selectedExistingProduct.stock || 0} ခု
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleClearSelectedExisting} style={styles.clearSelectionBtn}>
                    <Text style={styles.clearSelectionText}>အသစ်လုပ်မည်</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.label}>အမျိုးအစား (Category)</Text>
              <View style={styles.comboContainer}>
                <TextInput
                  style={styles.comboInput}
                  placeholder="ရွေးပါ သို့မဟုတ် အသစ်ရိုက်ပါ"
                  placeholderTextColor="#888"
                  value={selectedCategory}
                  onChangeText={setSelectedCategory}
                />
                <TouchableOpacity 
                  style={styles.comboDropdownBtn} 
                  onPress={() => { setPickerType('category'); setPickerModalVisible(true); }}
                >
                  <Ionicons name="list-outline" size={18} color="#007bff" />
                  <Text style={styles.comboDropdownText}>ရွေးရန်</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>အုပ်စုအမည် (Group Name)</Text>
              <View style={styles.comboContainer}>
                <TextInput
                  style={styles.comboInput}
                  placeholder="ရွေးပါ သို့မဟုတ် အသစ်ရိုက်ပါ"
                  placeholderTextColor="#888"
                  value={selectedGroup}
                  onChangeText={setSelectedGroup}
                />
                <TouchableOpacity 
                  style={styles.comboDropdownBtn} 
                  onPress={() => { setPickerType('group'); setPickerModalVisible(true); }}
                >
                  <Ionicons name="list-outline" size={18} color="#007bff" />
                  <Text style={styles.comboDropdownText}>ရွေးရန်</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>
                {!isEditing && selectedExistingProduct
                  ? 'ထပ်ဖြည့်မည့် အရေအတွက် (Add Stock) *'
                  : 'လက်ကျန် အရေအတွက် (Stock)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={!isEditing && selectedExistingProduct ? 'ထပ်ထည့်မည့် အရေအတွက် ရိုက်ပါ' : '0'}
                placeholderTextColor="#888"
                value={stock}
                onChangeText={setStock}
                keyboardType="numeric"
              />

              <Text style={styles.label}>ဝယ်ဈေး (Cost Price)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#888"
                value={costPrice}
                onChangeText={setCostPrice}
                keyboardType="numeric"
              />

              <Text style={styles.label}>ရောင်းဈေး (Selling Price) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#888"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)} disabled={loading}>
                  <Text style={styles.cancelBtnText}>ပိတ်မည်</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveProduct} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {isEditing ? 'ပြင်ဆင်မည်' : selectedExistingProduct ? 'Stock ထပ်ဖြည့်မည်' : 'သိမ်းမည်'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Percentage Price Update Modal */}
      <Modal animationType="slide" transparent={true} visible={percentModalVisible} onRequestClose={() => setPercentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>📈 ရာခိုင်နှုန်း(%) ဖြင့် ဈေးနှုန်းပြင်ဆင်ရန်</Text>
            
            <Text style={styles.label}>တိုးမြှင့်မည့် ရာခိုင်နှုန်း (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="ဥပမာ - 5 သို့မဟုတ် 10"
              placeholderTextColor="#888"
              value={markupPercent}
              onChangeText={setMarkupPercent}
              keyboardType="numeric"
            />

            <Text style={styles.label}>သက်ဆိုင်သည့် နယ်ပယ်</Text>
            <View style={styles.targetRow}>
              <TouchableOpacity 
                style={[styles.targetChip, targetType === 'all' && styles.targetChipActive]}
                onPress={() => setTargetType('all')}
              >
                <Text style={[styles.targetChipText, targetType === 'all' && styles.targetChipTextActive]}>ပစ္စည်းအားလုံး</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.targetChip, targetType === 'category' && styles.targetChipActive]}
                onPress={() => setTargetType('category')}
              >
                <Text style={[styles.targetChipText, targetType === 'category' && styles.targetChipTextActive]}>အမျိုးအစားအလိုက်</Text>
              </TouchableOpacity>
            </View>

            {targetType === 'category' && (
              <View style={{width: '100%', marginBottom: 12}}>
                <Text style={styles.label}>Category ရွေးပါ</Text>
                <TouchableOpacity 
                  style={styles.pickerSelector} 
                  onPress={() => { setPickerType('percent_category'); setPickerModalVisible(true); }}
                >
                  <Text style={styles.pickerSelectorText}>{selectedTargetCategory || 'Category ရွေးရန်'}</Text>
                  <Ionicons name="chevron-down" size={20} color="#555" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setPercentModalVisible(false)} disabled={loading}>
                <Text style={styles.cancelBtnText}>ပိတ်မည်</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#ff9800', marginLeft: 8}]} onPress={handleApplyPercentagePrice} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>ဈေးနှုန်းတင်မည်</Text>}
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Picker List Modal */}
      <Modal animationType="fade" transparent={true} visible={pickerModalVisible} onRequestClose={() => setPickerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <Text style={styles.modalTitle}>
              {pickerType === 'category' || pickerType === 'percent_category' ? 'ရှိပြီးသား အမျိုးအစားများ' : 'ရှိပြီးသား အုပ်စုများ'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{width: '100%'}}>
              {(pickerType === 'category' || pickerType === 'percent_category' ? categories : groupNames).length === 0 ? (
                <Text style={{textAlign: 'center', color: '#888', marginVertical: 20}}>စာရင်း မရှိသေးပါ။</Text>
              ) : (
                (pickerType === 'category' || pickerType === 'percent_category' ? categories : groupNames).map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.pickerItem}
                    onPress={() => {
                      if (pickerType === 'category') {
                        setSelectedCategory(item);
                      } else if (pickerType === 'percent_category') {
                        setSelectedTargetCategory(item);
                      } else {
                        setSelectedGroup(item);
                      }
                      setPickerModalVisible(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{item}</Text>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#007bff" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn, { marginTop: 15, width: '100%' }]} onPress={() => setPickerModalVisible(false)}>
              <Text style={styles.cancelBtnText}>ပိတ်မည်</Text>
            </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  headerActionBtns: { flexDirection: 'row', alignItems: 'center' },
  percentBtn: { backgroundColor: '#ff9800', padding: 9, borderRadius: 8, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  printListBtn: { backgroundColor: '#526579', padding: 9, borderRadius: 8, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', backgroundColor: '#28a745', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 5,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryDivider: { width: 1, height: '80%', backgroundColor: '#eee' },
  summaryLabel: { fontSize: 11, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 'bold' },
  content: { flex: 1, padding: 15, paddingTop: 5 },
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
  productName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  productCategory: { fontSize: 13, color: '#666', marginBottom: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  priceText: { fontSize: 13, fontWeight: 'bold', color: '#007bff' },
  qtyText: { fontSize: 13, fontWeight: 'bold', color: '#28a745' },
  actionMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
    width: '100%',
  },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', maxHeight: '85%', backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 4, marginTop: 4, alignSelf: 'flex-start' },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 14, color: '#333', height: 42, width: '100%' },
  suggestionBox: {
    backgroundColor: '#f4f8ff',
    borderWidth: 1,
    borderColor: '#bcd4ff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    width: '100%',
  },
  suggestionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e3ecff',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#222',
  },
  suggestionMeta: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  suggestionStockBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  suggestionStockText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  selectedExistingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderColor: '#28a745',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    width: '100%',
  },
  selectedExistingTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  selectedExistingSub: {
    fontSize: 11,
    color: '#2e7d32',
    marginTop: 2,
  },
  clearSelectionBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  clearSelectionText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  comboContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, height: 42, width: '100%' },
  comboInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', paddingHorizontal: 10, borderTopLeftRadius: 8, borderBottomLeftRadius: 8, fontSize: 14, color: '#333', height: '100%' },
  comboDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderLeftWidth: 0,
    paddingHorizontal: 12,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    height: '100%',
    justifyContent: 'center',
  },
  comboDropdownText: { fontSize: 13, color: '#007bff', fontWeight: 'bold', marginLeft: 4 },
  pickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
    height: 42,
    width: '100%',
  },
  pickerSelectorText: { fontSize: 14, color: '#333' },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    width: '100%'
  },
  pickerItemText: { fontSize: 15, color: '#333' },
  targetRow: { flexDirection: 'row', marginBottom: 8, width: '100%' },
  targetChip: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center', marginRight: 6, backgroundColor: '#f9f9f9' },
  targetChipActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  targetChipText: { fontSize: 13, color: '#555' },
  targetChipTextActive: { color: '#fff', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, width: '100%' },
  modalBtn: {  padding: 10, borderRadius: 8, alignItems: 'center', height: 42, justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#e0e0e0', marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: '#333', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  saveBtn: { backgroundColor: '#28a745', marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
});